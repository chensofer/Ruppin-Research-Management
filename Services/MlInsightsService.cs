using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;

namespace RupResearchAPI.Services;

/// <summary>
/// Pure C# port of ml_component/ml_insights.py.
/// Implements the same feature engineering, Random Forest, and KMeans
/// algorithms to produce identical JSON output structure.
/// </summary>
public sealed class MlInsightsService : IMlInsightsService
{
    private readonly AppDbContext _db;
    public MlInsightsService(AppDbContext db) => _db = db;

    // ── Constants (matching Python) ──────────────────────────────────────
    private const double RiskThreshold = 1.2;
    private const double AmountFlagThreshold = 1.5;
    private const string UnknownCategory = "לא ידוע";

    private static readonly string[] ApprovedStatuses = ["אושר", "שולם"];
    private static readonly string[] RejectedStatuses = ["נדחה"];

    // Feature column name lists (matching Python module constants)
    private static readonly string[] RiskNumeric =
    [
        "log_amount", "total_budget", "days_to_due", "has_due_date",
        "request_month", "project_progress_at_request", "requests_so_far",
        "cum_spend_ratio",
    ];
    private static readonly string[] ApprovalNumeric =
    [
        "log_amount", "amount_to_budget_ratio", "days_to_due", "has_due_date",
        "request_month", "request_day_of_week", "request_is_weekend",
        "project_progress_at_request", "is_amount_outlier",
    ];
    // forecast: FORECAST_NUMERIC_FEATURES minus "amount_to_budget_ratio"
    private static readonly string[] ForecastNumeric =
    [
        "total_budget", "days_to_due", "has_due_date",
        "request_month", "request_day_of_week", "project_progress_at_request",
    ];
    private static readonly string[] ClusterFeatures =
    [
        "total_budget", "num_requests", "total_requested", "avg_request_amount",
        "num_categories", "num_outliers", "total_approved", "approval_rate",
        "budget_utilization",
    ];

    // ── Internal data row ────────────────────────────────────────────────
    private sealed class PayRow
    {
        public int    RequestId;
        public int    ProjectId;
        public double RequestedAmount;
        public string CategoryName = "";
        public DateTime RequestDate;
        public DateTime? DueDate;
        public string Status = "";
        public double TotalBudget;
        public DateTime? ProjectStart;
        public DateTime? ProjectEnd;

        // Engineered features
        public double LogAmount;
        public double AmountToBudgetRatio;
        public double DaysToDue;
        public int    HasDueDate;
        public int    RequestMonth;
        public int    RequestDayOfWeek;
        public int    RequestIsWeekend;
        public double ProjectProgress;
        public int    IsAmountOutlier;
        public int?   ApprovedLabel; // 1=approved, 0=rejected, null=pending

        // Risk-specific
        public double CumApprovedAmount;  // running cumulative approved
        public double CumSpendRatio;      // CumApprovedAmount / TotalBudget at request time
        public double SpendRatioIfApproved;
        public double TimeRatio;
        public int    RequestsSoFar;
        public int    BudgetRiskLabel;

        // Feature vector (built dynamically based on all category dummies)
        public Dictionary<string, double> Features = new();
    }

    private sealed class ProjRow
    {
        public int      ProjectId;
        public double   TotalBudget;
        public DateTime? StartDate;
        public DateTime? EndDate;
    }

    // ── Math helpers ─────────────────────────────────────────────────────
    private static double Log1p(double x)  => Math.Log(1.0 + x);
    private static double Expm1(double x)  => Math.Exp(x) - 1.0;

    private static double Quantile(double[] sortedVals, double p)
    {
        if (sortedVals.Length == 0) return 0.0;
        double pos = p * (sortedVals.Length - 1);
        int lo = (int)pos;
        int hi = lo + 1;
        if (hi >= sortedVals.Length) return sortedVals[^1];
        return sortedVals[lo] + (pos - lo) * (sortedVals[hi] - sortedVals[lo]);
    }

    // ── StandardScaler ────────────────────────────────────────────────────
    private sealed class Scaler
    {
        private readonly double[] _mean;
        private readonly double[] _std;

        public Scaler(double[][] rows, int[] colIdx)
        {
            _mean = new double[colIdx.Length];
            _std  = new double[colIdx.Length];
            for (int j = 0; j < colIdx.Length; j++)
            {
                int c = colIdx[j];
                double m = rows.Average(r => r[c]);
                double s = Math.Sqrt(rows.Average(r => Math.Pow(r[c] - m, 2)));
                _mean[j] = m;
                _std[j]  = s < 1e-9 ? 1.0 : s;
            }
        }

        public double[] Apply(double[] row, int[] colIdx)
        {
            var r = (double[])row.Clone();
            for (int j = 0; j < colIdx.Length; j++)
                r[colIdx[j]] = (r[colIdx[j]] - _mean[j]) / _std[j];
            return r;
        }

        public double[][] ApplyAll(double[][] rows, int[] colIdx)
            => rows.Select(r => Apply(r, colIdx)).ToArray();
    }

    // ── Decision Tree node ────────────────────────────────────────────────
    private sealed class TreeNode
    {
        public bool     IsLeaf;
        public int      FeatureIdx;
        public double   Threshold;
        public double   ProbaPos;   // P(class=1) for classifier leaf
        public double   LeafVal;    // mean(y) for regressor leaf
        public TreeNode? Left, Right;

        public double PredictP(double[] x) =>
            IsLeaf ? ProbaPos : (x[FeatureIdx] <= Threshold ? Left! : Right!).PredictP(x);

        public double PredictV(double[] x) =>
            IsLeaf ? LeafVal  : (x[FeatureIdx] <= Threshold ? Left! : Right!).PredictV(x);
    }

    // ── Tree builder – classifier (weighted Gini) ────────────────────────
    private static TreeNode BuildClassTree(
        double[][] X, int[] y, double[] w,
        int depth, int maxDepth, int nFeatures, Random rng)
    {
        double totalW = w.Sum();
        double posW   = 0;
        for (int i = 0; i < y.Length; i++) if (y[i] == 1) posW += w[i];
        double negW = totalW - posW;

        if (depth >= maxDepth || X.Length <= 1 || posW < 1e-9 || negW < 1e-9)
            return new TreeNode { IsLeaf = true, ProbaPos = posW / totalW };

        int nTry = Math.Max(1, (int)Math.Sqrt(nFeatures));
        int[] feats = Enumerable.Range(0, nFeatures).OrderBy(_ => rng.Next()).Take(nTry).ToArray();

        int    bestFeat  = -1;
        double bestThresh = 0, bestGain = 0;

        foreach (int fi in feats)
        {
            var sorted = X.Select((row, i) => (v: row[fi], y: y[i], w: w[i]))
                          .OrderBy(t => t.v).ToArray();

            double lP = 0, lN = 0, rP = posW, rN = negW;

            for (int i = 0; i < sorted.Length - 1; i++)
            {
                if (sorted[i].y == 1) { lP += sorted[i].w; rP -= sorted[i].w; }
                else                  { lN += sorted[i].w; rN -= sorted[i].w; }

                if (Math.Abs(sorted[i].v - sorted[i + 1].v) < 1e-9) continue;

                double lW = lP + lN, rW = rP + rN;
                if (lW < 1e-9 || rW < 1e-9) continue;

                double gL = 1 - (lP / lW) * (lP / lW) - (lN / lW) * (lN / lW);
                double gR = 1 - (rP / rW) * (rP / rW) - (rN / rW) * (rN / rW);
                double gP = 1 - (posW / totalW) * (posW / totalW) - (negW / totalW) * (negW / totalW);
                double gain = gP - (lW / totalW) * gL - (rW / totalW) * gR;

                if (gain > bestGain)
                {
                    bestGain = gain; bestFeat = fi;
                    bestThresh = (sorted[i].v + sorted[i + 1].v) / 2.0;
                }
            }
        }

        if (bestFeat < 0)
            return new TreeNode { IsLeaf = true, ProbaPos = posW / totalW };

        var lIdx = Enumerable.Range(0, X.Length).Where(i => X[i][bestFeat] <= bestThresh).ToArray();
        var rIdx = Enumerable.Range(0, X.Length).Where(i => X[i][bestFeat] >  bestThresh).ToArray();
        if (lIdx.Length == 0 || rIdx.Length == 0)
            return new TreeNode { IsLeaf = true, ProbaPos = posW / totalW };

        return new TreeNode
        {
            FeatureIdx = bestFeat, Threshold = bestThresh,
            Left  = BuildClassTree(lIdx.Select(i => X[i]).ToArray(), lIdx.Select(i => y[i]).ToArray(),
                                   lIdx.Select(i => w[i]).ToArray(), depth + 1, maxDepth, nFeatures, rng),
            Right = BuildClassTree(rIdx.Select(i => X[i]).ToArray(), rIdx.Select(i => y[i]).ToArray(),
                                   rIdx.Select(i => w[i]).ToArray(), depth + 1, maxDepth, nFeatures, rng),
        };
    }

    // ── Tree builder – regressor (MSE) ────────────────────────────────────
    private static TreeNode BuildRegressTree(
        double[][] X, double[] y,
        int depth, int maxDepth, int nFeatures, Random rng)
    {
        if (depth >= maxDepth || X.Length <= 1)
            return new TreeNode { IsLeaf = true, LeafVal = y.Average() };

        int nTry = Math.Max(1, (int)Math.Sqrt(nFeatures));
        int[] feats = Enumerable.Range(0, nFeatures).OrderBy(_ => rng.Next()).Take(nTry).ToArray();

        int bestFeat = -1; double bestThresh = 0, bestDelta = 0;
        double parentMse = Mse(y);

        foreach (int fi in feats)
        {
            var sorted = X.Select((row, i) => (v: row[fi], y: y[i])).OrderBy(t => t.v).ToArray();
            var lY = new List<double>();
            var rY = sorted.Select(t => t.y).ToList();

            for (int i = 0; i < sorted.Length - 1; i++)
            {
                lY.Add(sorted[i].y); rY.RemoveAt(0);
                if (Math.Abs(sorted[i].v - sorted[i + 1].v) < 1e-9) continue;
                if (lY.Count == 0 || rY.Count == 0) continue;

                double gain = parentMse
                    - (lY.Count / (double)y.Length) * Mse([.. lY])
                    - (rY.Count / (double)y.Length) * Mse([.. rY]);

                if (gain > bestDelta)
                {
                    bestDelta = gain; bestFeat = fi;
                    bestThresh = (sorted[i].v + sorted[i + 1].v) / 2.0;
                }
            }
        }

        if (bestFeat < 0)
            return new TreeNode { IsLeaf = true, LeafVal = y.Average() };

        var lIdx = Enumerable.Range(0, X.Length).Where(i => X[i][bestFeat] <= bestThresh).ToArray();
        var rIdx = Enumerable.Range(0, X.Length).Where(i => X[i][bestFeat] >  bestThresh).ToArray();
        if (lIdx.Length == 0 || rIdx.Length == 0)
            return new TreeNode { IsLeaf = true, LeafVal = y.Average() };

        return new TreeNode
        {
            FeatureIdx = bestFeat, Threshold = bestThresh,
            Left  = BuildRegressTree(lIdx.Select(i => X[i]).ToArray(), lIdx.Select(i => y[i]).ToArray(),
                                     depth + 1, maxDepth, nFeatures, rng),
            Right = BuildRegressTree(rIdx.Select(i => X[i]).ToArray(), rIdx.Select(i => y[i]).ToArray(),
                                     depth + 1, maxDepth, nFeatures, rng),
        };
    }

    private static double Mse(double[] y)
    {
        if (y.Length == 0) return 0;
        double m = y.Average();
        return y.Average(v => (v - m) * (v - m));
    }

    // ── Random Forest helpers ─────────────────────────────────────────────
    private static double[] RFClassifierPredictProba(
        double[][] trainX, int[] trainY, double[][] testX,
        int nTrees = 200, int maxDepth = 5, int seed = 42)
    {
        int n = trainY.Length;
        int nPos = trainY.Count(v => v == 1);
        int nNeg = n - nPos;
        double wPos = nPos > 0 ? n / (2.0 * nPos) : 1.0;
        double wNeg = nNeg > 0 ? n / (2.0 * nNeg) : 1.0;
        double[] baseW = trainY.Select(yi => yi == 1 ? wPos : wNeg).ToArray();

        var rng = new Random(seed);
        int nF = trainX[0].Length;
        var trees = new TreeNode[nTrees];
        for (int t = 0; t < nTrees; t++)
        {
            var idx = Enumerable.Range(0, n).Select(_ => rng.Next(n)).ToArray();
            trees[t] = BuildClassTree(
                idx.Select(i => trainX[i]).ToArray(),
                idx.Select(i => trainY[i]).ToArray(),
                idx.Select(i => baseW[i]).ToArray(),
                0, maxDepth, nF, rng);
        }
        return testX.Select(x => trees.Average(t => t.PredictP(x))).ToArray();
    }

    private static double[] RFRegressorPredict(
        double[][] trainX, double[] trainY, double[][] testX,
        int nTrees = 200, int maxDepth = 5, int seed = 42)
    {
        int n = trainY.Length;
        var rng = new Random(seed);
        int nF = trainX[0].Length;
        var trees = new TreeNode[nTrees];
        for (int t = 0; t < nTrees; t++)
        {
            var idx = Enumerable.Range(0, n).Select(_ => rng.Next(n)).ToArray();
            trees[t] = BuildRegressTree(
                idx.Select(i => trainX[i]).ToArray(),
                idx.Select(i => trainY[i]).ToArray(),
                0, maxDepth, nF, rng);
        }
        return testX.Select(x => trees.Average(t => t.PredictV(x))).ToArray();
    }

    // ── KMeans ────────────────────────────────────────────────────────────
    private static int[] KMeans(double[][] X, int k, int nInit = 10, int seed = 42)
    {
        if (X.Length <= k)
            return Enumerable.Range(0, X.Length).Select(i => i % k).ToArray();

        int n = X.Length, dim = X[0].Length;
        int[]? bestLabels = null;
        double bestInertia = double.MaxValue;
        var rng = new Random(seed);

        for (int init = 0; init < nInit; init++)
        {
            var centroids = Enumerable.Range(0, k)
                .Select(_ => (double[])X[rng.Next(n)].Clone()).ToArray();

            int[] labels = new int[n];
            bool changed = true;
            for (int iter = 0; iter < 300 && changed; iter++)
            {
                changed = false;
                for (int i = 0; i < n; i++)
                {
                    int best = 0; double bestD = double.MaxValue;
                    for (int c = 0; c < k; c++)
                    {
                        double d = SqDist(X[i], centroids[c]);
                        if (d < bestD) { bestD = d; best = c; }
                    }
                    if (labels[i] != best) { labels[i] = best; changed = true; }
                }
                var sums  = Enumerable.Range(0, k).Select(_ => new double[dim]).ToArray();
                var cnts  = new int[k];
                for (int i = 0; i < n; i++) { cnts[labels[i]]++; for (int d = 0; d < dim; d++) sums[labels[i]][d] += X[i][d]; }
                for (int c = 0; c < k; c++)
                    if (cnts[c] > 0) for (int d = 0; d < dim; d++) centroids[c][d] = sums[c][d] / cnts[c];
            }

            double inertia = Enumerable.Range(0, n).Sum(i => SqDist(X[i], centroids[labels[i]]));
            if (inertia < bestInertia) { bestInertia = inertia; bestLabels = (int[])labels.Clone(); }
        }
        return bestLabels!;
    }

    private static double SqDist(double[] a, double[] b)
    {
        double s = 0;
        for (int i = 0; i < a.Length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
        return s;
    }

    // ── Feature vector builder ────────────────────────────────────────────
    /// <summary>
    /// Converts a PayRow into a fixed-length double[] using the given
    /// ordered list of column names (numeric + category dummies).
    /// </summary>
    private static double[] BuildVector(PayRow r, string[] colNames)
    {
        var v = new double[colNames.Length];
        for (int i = 0; i < colNames.Length; i++)
        {
            v[i] = colNames[i] switch
            {
                "log_amount"                   => r.LogAmount,
                "total_budget"                 => r.TotalBudget,
                "amount_to_budget_ratio"       => r.AmountToBudgetRatio,
                "days_to_due"                  => r.DaysToDue,
                "has_due_date"                 => r.HasDueDate,
                "request_month"                => r.RequestMonth,
                "request_day_of_week"          => r.RequestDayOfWeek,
                "request_is_weekend"           => r.RequestIsWeekend,
                "project_progress_at_request"  => r.ProjectProgress,
                "is_amount_outlier"            => r.IsAmountOutlier,
                "requests_so_far"              => r.RequestsSoFar,
                "cum_spend_ratio"              => r.CumSpendRatio,
                _ => r.Features.TryGetValue(colNames[i], out double val) ? val : 0.0,
            };
        }
        return v;
    }

    // ── Main pipeline ─────────────────────────────────────────────────────
    public async Task<string> RunInsightsAsync()
    {
        var today = DateTime.UtcNow.Date;

        // 1. Load raw data from DB ──────────────────────────────────────
        var rawPay = await (
            from pr in _db.ResearchPaymentRequests
            join p  in _db.ResearchProjects on pr.ProjectId equals p.ProjectId
            select new
            {
                pr.PaymentRequestId, pr.ProjectId,
                pr.RequestedAmount, pr.CategoryName,
                pr.RequestDate, pr.DueDate, pr.Status,
                p.TotalBudget,
                ProjectStart = p.StartDate,
                ProjectEnd   = p.EndDate,
            }
        ).ToListAsync();

        var rawProj = await _db.ResearchProjects
            .Where(p => !p.IsArchived)
            .Select(p => new ProjRow
            {
                ProjectId  = p.ProjectId,
                TotalBudget = (double)(p.TotalBudget ?? 0),
                StartDate  = p.StartDate.HasValue ? p.StartDate.Value.ToDateTime(TimeOnly.MinValue) : null,
                EndDate    = p.EndDate.HasValue   ? p.EndDate.Value.ToDateTime(TimeOnly.MinValue)   : null,
            }).ToListAsync();

        // 2. Clean (matching data_prep.clean_payment_requests) ─────────
        var rows = rawPay
            .Where(r => r.RequestedAmount.HasValue && r.RequestedAmount.Value > 0)
            .GroupBy(r => r.PaymentRequestId).Select(g => g.First())  // dedup
            .Select(r => new PayRow
            {
                RequestId       = r.PaymentRequestId,
                ProjectId       = r.ProjectId ?? 0,
                RequestedAmount = (double)(r.RequestedAmount ?? 0),
                CategoryName    = string.IsNullOrWhiteSpace(r.CategoryName) ? UnknownCategory : r.CategoryName,
                RequestDate     = r.RequestDate.HasValue ? r.RequestDate.Value.ToDateTime(TimeOnly.MinValue) : today,
                DueDate         = r.DueDate.HasValue ? r.DueDate.Value.ToDateTime(TimeOnly.MinValue) : null,
                Status          = r.Status ?? "",
                TotalBudget     = (double)(r.TotalBudget ?? 0),
                ProjectStart    = r.ProjectStart.HasValue ? r.ProjectStart.Value.ToDateTime(TimeOnly.MinValue) : null,
                ProjectEnd      = r.ProjectEnd.HasValue   ? r.ProjectEnd.Value.ToDateTime(TimeOnly.MinValue)   : null,
            }).ToList();

        if (rows.Count == 0)
            return JsonSerializer.Serialize(new { projects = new { }, clusters = new { }, pending_requests = new { } });

        // 3. Outlier detection (IQR) ────────────────────────────────────
        var amounts = rows.Select(r => r.RequestedAmount).OrderBy(v => v).ToArray();
        double q1 = Quantile(amounts, 0.25), q3 = Quantile(amounts, 0.75);
        double iqr = q3 - q1;
        double iqrLo = q1 - 1.5 * iqr, iqrHi = q3 + 1.5 * iqr;
        foreach (var r in rows)
            r.IsAmountOutlier = (r.RequestedAmount < iqrLo || r.RequestedAmount > iqrHi) ? 1 : 0;

        // 4. Date features + feature engineering ───────────────────────
        // Compute median days_to_due for filling missing values
        var daysToDueRaw = rows.Where(r => r.DueDate.HasValue)
            .Select(r => (double)(r.DueDate!.Value - r.RequestDate).Days)
            .OrderBy(v => v).ToArray();
        double medianDaysToDue = daysToDueRaw.Length > 0 ? Quantile(daysToDueRaw, 0.5) : 30.0;

        foreach (var r in rows)
        {
            // Date features
            r.RequestMonth      = r.RequestDate.Month;
            r.RequestDayOfWeek  = (int)r.RequestDate.DayOfWeek; // 0=Sunday, matches Python Monday=0 ... Friday=4
            r.RequestIsWeekend  = (r.RequestDate.DayOfWeek == DayOfWeek.Friday ||
                                   r.RequestDate.DayOfWeek == DayOfWeek.Saturday) ? 1 : 0;
            r.HasDueDate        = r.DueDate.HasValue ? 1 : 0;
            r.DaysToDue         = r.DueDate.HasValue
                                  ? (r.DueDate.Value - r.RequestDate).Days
                                  : medianDaysToDue;

            if (r.ProjectStart.HasValue && r.ProjectEnd.HasValue)
            {
                double duration = Math.Max(1, (r.ProjectEnd.Value - r.ProjectStart.Value).TotalDays);
                double elapsed  = (r.RequestDate - r.ProjectStart.Value).TotalDays;
                r.ProjectProgress = Math.Clamp(elapsed / duration, 0, 2);
            }

            // Feature engineering
            r.AmountToBudgetRatio = r.TotalBudget > 0 ? r.RequestedAmount / r.TotalBudget : 0;
            r.LogAmount           = Log1p(r.RequestedAmount);

            // Approval label
            if (ApprovedStatuses.Contains(r.Status))      r.ApprovedLabel = 1;
            else if (RejectedStatuses.Contains(r.Status)) r.ApprovedLabel = 0;
            else                                           r.ApprovedLabel = null;
        }

        // 5. Build category dummies ─────────────────────────────────────
        var categories = rows.Select(r => r.CategoryName).Distinct().OrderBy(s => s).ToList();
        string CategoryCol(string cat) => "category_name_" + cat;
        foreach (var r in rows)
            foreach (var cat in categories)
                r.Features[CategoryCol(cat)] = r.CategoryName == cat ? 1.0 : 0.0;

        var categoryDummyCols = categories.Select(CategoryCol).ToArray();

        // 6. Budget risk labelling (budget_risk_classifier.build_risk_label) ──
        var riskRows = rows.OrderBy(r => r.ProjectId).ThenBy(r => r.RequestDate).ToList();
        var cumApproved = new Dictionary<int, double>();
        foreach (var r in riskRows)
        {
            if (!cumApproved.ContainsKey(r.ProjectId)) cumApproved[r.ProjectId] = 0;

            double cumWithCurrent = cumApproved[r.ProjectId]
                + (r.ApprovedLabel == null ? r.RequestedAmount : 0);

            r.CumApprovedAmount    = cumApproved[r.ProjectId];
            r.CumSpendRatio        = r.TotalBudget > 0 ? cumApproved[r.ProjectId] / r.TotalBudget : 0;
            r.SpendRatioIfApproved = r.TotalBudget > 0 ? cumWithCurrent / r.TotalBudget : 0;
            r.TimeRatio            = Math.Max(0.01, r.ProjectProgress);
            r.BudgetRiskLabel      = r.SpendRatioIfApproved > r.TimeRatio * RiskThreshold ? 1 : 0;

            if (r.ApprovedLabel == 1) cumApproved[r.ProjectId] += r.RequestedAmount;
        }

        // requests_so_far per project (cumulative count, 1-indexed)
        var reqCount = new Dictionary<int, int>();
        foreach (var r in riskRows)
        {
            if (!reqCount.ContainsKey(r.ProjectId)) reqCount[r.ProjectId] = 0;
            r.RequestsSoFar = ++reqCount[r.ProjectId];
        }

        // 7. Train risk RF and predict for active projects ─────────────
        string[] riskCols = [.. RiskNumeric, .. categoryDummyCols];

        var labeledRisk = riskRows.Where(r => r.BudgetRiskLabel >= 0).ToList();
        var riskX = labeledRisk.Select(r => BuildVector(r, riskCols)).ToArray();
        var riskY = labeledRisk.Select(r => r.BudgetRiskLabel).ToArray();

        // Scale numeric features
        int[] riskNumIdx = RiskNumeric.Select(n => Array.IndexOf(riskCols, n)).ToArray();
        var riskScaler = new Scaler(riskX, riskNumIdx);
        var riskXScaled = riskScaler.ApplyAll(riskX, riskNumIdx);

        Dictionary<int, double> riskScores = new();
        if (riskXScaled.Length >= 2 && riskY.Contains(0) && riskY.Contains(1))
        {
            // Build one "current state" feature row per active project
            var projectTestVectors = new List<(int projId, double[] vec)>();
            double medDaysToDue = medianDaysToDue;
            var meanLogAmount = riskRows.Average(r => r.LogAmount);
            var perProjectCount = riskRows.GroupBy(r => r.ProjectId)
                .ToDictionary(g => g.Key, g => g.Count());

            foreach (var proj in rawProj)
            {
                DateTime start  = proj.StartDate ?? today;
                DateTime end    = proj.EndDate   ?? today.AddYears(1);
                double duration = Math.Max(1, (end - start).TotalDays);
                double elapsed  = (today - start).TotalDays;
                double progress = Math.Clamp(elapsed / duration, 0, 2);

                double currentSpendRatio = 0;
                if (proj.TotalBudget > 0)
                {
                    double totalApproved = riskRows
                        .Where(r => r.ProjectId == proj.ProjectId && r.ApprovedLabel == 1)
                        .Sum(r => r.RequestedAmount);
                    currentSpendRatio = totalApproved / proj.TotalBudget;
                }

                var testRow = new PayRow
                {
                    ProjectId     = proj.ProjectId,
                    TotalBudget   = proj.TotalBudget,
                    LogAmount     = meanLogAmount,
                    DaysToDue     = medDaysToDue,
                    HasDueDate    = 0,
                    RequestMonth  = today.Month,
                    ProjectProgress = progress,
                    RequestsSoFar = perProjectCount.TryGetValue(proj.ProjectId, out int cnt) ? cnt + 1 : 1,
                    CumSpendRatio = currentSpendRatio,
                };
                // zero category dummies
                foreach (var cat in categories) testRow.Features[CategoryCol(cat)] = 0.0;

                var vec = BuildVector(testRow, riskCols);
                vec = riskScaler.Apply(vec, riskNumIdx);
                projectTestVectors.Add((proj.ProjectId, vec));
            }

            if (projectTestVectors.Count > 0)
            {
                var testX = projectTestVectors.Select(t => t.vec).ToArray();
                var proba = RFClassifierPredictProba(riskXScaled, riskY, testX);
                for (int i = 0; i < projectTestVectors.Count; i++)
                    riskScores[projectTestVectors[i].projId] = proba[i];
            }
        }

        // 8. Clustering on project features (project_clustering) ──────
        // Build per-project aggregates
        var projFeatures = new List<(int projId, double[] vec)>();
        var projGroups = rows.GroupBy(r => r.ProjectId).ToDictionary(g => g.Key, g => g.ToList());

        // Only cluster projects that have at least one payment request
        var projsWithRequests = projGroups.Keys.ToHashSet();

        foreach (var proj in rawProj.Where(p => projsWithRequests.Contains(p.ProjectId)))
        {
            var pRows = projGroups[proj.ProjectId];
            double totalBudget    = proj.TotalBudget;
            int    numRequests    = pRows.Count;
            double totalRequested = pRows.Sum(r => r.RequestedAmount);
            double avgRequest     = numRequests > 0 ? totalRequested / numRequests : 0;
            int    numCategories  = pRows.Select(r => r.CategoryName).Distinct().Count();
            int    numOutliers    = pRows.Sum(r => r.IsAmountOutlier);
            double totalApproved  = pRows.Where(r => r.ApprovedLabel == 1).Sum(r => r.RequestedAmount);

            var decided = pRows.Where(r => r.ApprovedLabel.HasValue).ToList();
            double approvalRate = decided.Count > 0
                ? decided.Average(r => r.ApprovedLabel!.Value)
                : 1.0;

            double budgetUtil = totalBudget > 0 ? totalApproved / totalBudget : 0;

            projFeatures.Add((proj.ProjectId, [
                totalBudget, numRequests, totalRequested, avgRequest,
                numCategories, numOutliers, totalApproved, approvalRate, budgetUtil
            ]));
        }

        Dictionary<int, int>    projCluster     = new();
        Dictionary<int, string> clusterLabels   = new();
        Dictionary<int, double> clusterAvgUtil  = new();
        Dictionary<int, List<int>> clusterProjs = new();

        if (projFeatures.Count >= 1)
        {
            var clusterX = projFeatures.Select(t => t.vec).ToArray();
            var clusterXS = clusterX.Select(r => (double[])r.Clone()).ToArray();

            // Scale all cluster features
            int[] allIdx = Enumerable.Range(0, ClusterFeatures.Length).ToArray();
            var clusterScaler = new Scaler(clusterX, allIdx);
            clusterXS = clusterScaler.ApplyAll(clusterXS, allIdx);

            int nClusters = Math.Min(3, projFeatures.Count);
            int[] labels  = KMeans(clusterXS, nClusters);

            for (int i = 0; i < projFeatures.Count; i++)
                projCluster[projFeatures[i].projId] = labels[i];

            // compute avg_budget_utilization per cluster (index 8 = budget_utilization)
            var clusterUtil = new Dictionary<int, List<double>>();
            for (int i = 0; i < projFeatures.Count; i++)
            {
                int c = labels[i];
                if (!clusterUtil.ContainsKey(c)) clusterUtil[c] = [];
                clusterUtil[c].Add(projFeatures[i].vec[8]); // budget_utilization
                if (!clusterProjs.ContainsKey(c)) clusterProjs[c] = [];
                clusterProjs[c].Add(projFeatures[i].projId);
            }

            var sortedUtils = clusterUtil.OrderBy(kv => kv.Key)
                .ToDictionary(kv => kv.Key, kv => kv.Value.Average());
            clusterAvgUtil = sortedUtils;

            var sortedByUtil = sortedUtils.Values.OrderBy(v => v).ToList();
            foreach (var (clusterId, avgUtil) in sortedUtils)
            {
                int rank = sortedByUtil.IndexOf(avgUtil);
                clusterLabels[clusterId] = rank == 0 ? "פרופיל חסכוני"
                    : rank == sortedByUtil.Count - 1 ? "פרופיל בסיכון - שריפת תקציב מהירה"
                    : "פרופיל תקין";
            }
        }

        // 9. Pending request insights ──────────────────────────────────
        string[] approvalCols = [.. ApprovalNumeric, .. categoryDummyCols];
        string[] forecastCols = [.. ForecastNumeric, .. categoryDummyCols];

        var pendingRows = rows.Where(r => r.ApprovedLabel == null).ToList();
        var labeledRows = rows.Where(r => r.ApprovedLabel.HasValue).ToList();

        var pendingInsights = new Dictionary<string, object>();

        if (pendingRows.Count > 0)
        {
            // --- Approval model ---
            var allApprovalX = rows.Select(r => BuildVector(r, approvalCols)).ToArray();
            int[] approvalNumIdx = ApprovalNumeric.Select(n => Array.IndexOf(approvalCols, n)).ToArray();
            var approvalScaler = new Scaler(
                labeledRows.Select(r => BuildVector(r, approvalCols)).ToArray(),
                approvalNumIdx);

            var approvalXScaled = approvalScaler.ApplyAll(allApprovalX, approvalNumIdx);

            int[] labeledIdxInAll = rows.Select((r, i) => (r, i))
                .Where(t => t.r.ApprovedLabel.HasValue).Select(t => t.i).ToArray();
            int[] pendingIdxInAll = rows.Select((r, i) => (r, i))
                .Where(t => !t.r.ApprovedLabel.HasValue).Select(t => t.i).ToArray();

            var trainApprovalX = labeledIdxInAll.Select(i => approvalXScaled[i]).ToArray();
            var trainApprovalY = labeledIdxInAll.Select(i => rows[i].ApprovedLabel!.Value).ToArray();
            var testApprovalX  = pendingIdxInAll.Select(i => approvalXScaled[i]).ToArray();

            double[] approvalProba = trainApprovalX.Length >= 2
                                    && trainApprovalY.Contains(0) && trainApprovalY.Contains(1)
                ? RFClassifierPredictProba(trainApprovalX, trainApprovalY, testApprovalX)
                : testApprovalX.Select(_ => 0.5).ToArray();

            // --- Forecast model ---
            var allForecastX = rows.Select(r => BuildVector(r, forecastCols)).ToArray();
            int[] forecastNumIdx = ForecastNumeric.Select(n => Array.IndexOf(forecastCols, n)).ToArray();
            // Scaler fitted on ALL rows (same as Python: fit_transform on whole X_forecast)
            var forecastScaler = new Scaler(allForecastX, forecastNumIdx);
            var forecastXScaled = forecastScaler.ApplyAll(allForecastX, forecastNumIdx);

            var trainForecastX = forecastXScaled;
            var trainForecastY = rows.Select(r => Log1p(r.RequestedAmount)).ToArray();
            var testForecastX  = pendingIdxInAll.Select(i => forecastXScaled[i]).ToArray();

            double[] expectedAmounts = trainForecastX.Length >= 2
                ? RFRegressorPredict(trainForecastX, trainForecastY, testForecastX)
                      .Select(v => Expm1(v)).ToArray()
                : testForecastX.Select(_ => rows.Average(r => r.RequestedAmount)).ToArray();

            // --- Approved means for reason generation ---
            var approvedForMeans = rows.Where(r => r.ApprovedLabel == 1).ToList();
            double meanApprovedRatio    = approvedForMeans.Count > 0 ? approvedForMeans.Average(r => r.AmountToBudgetRatio) : 0;
            double meanApprovedDays     = approvedForMeans.Count > 0 ? approvedForMeans.Average(r => r.DaysToDue) : 30;
            double meanApprovedProgress = approvedForMeans.Count > 0 ? approvedForMeans.Average(r => r.ProjectProgress) : 0.5;

            // --- Build per-pending-request output ---
            for (int j = 0; j < pendingRows.Count; j++)
            {
                var pr      = pendingRows[j];
                double proba = approvalProba[j];
                double exp   = expectedAmounts[j];
                double actual = pr.RequestedAmount;
                double ratio  = exp > 0 ? actual / exp : 1.0;
                bool   amtFlag = ratio >= AmountFlagThreshold;

                var reasons = new List<string>();
                if (amtFlag)
                    reasons.Add(
                        $"הסכום המבוקש (₪{actual:N0}) גבוה בכ-{ratio:F1} פעמים מהסכום הצפוי " +
                        $"לבקשה מסוג זה (₪{exp:N0}), בהתבסס על בקשות דומות מהעבר.");

                if (proba < 0.5)
                {
                    if (pr.IsAmountOutlier == 1)
                        reasons.Add("הסכום המבוקש הוא חריג סטטיסטי (Outlier) בהשוואה לכל בקשות התשלום במערכת.");
                    if (pr.AmountToBudgetRatio > meanApprovedRatio * 1.5)
                        reasons.Add("הבקשה מהווה אחוז גבוה מהתקציב הכולל של הפרויקט, בהשוואה לבקשות שאושרו בעבר.");
                    if (pr.DaysToDue < meanApprovedDays * 0.5)
                        reasons.Add("מועד היעד לתשלום קרוב משמעותית מהרגיל, בהשוואה לבקשות שאושרו בעבר.");
                    if (pr.ProjectProgress > meanApprovedProgress + 0.3)
                        reasons.Add("הבקשה מוגשת בשלב מתקדם יותר בציר הזמן של הפרויקט, בהשוואה לבקשות שאושרו בעבר.");
                    if (reasons.Count == 0)
                        reasons.Add("מאפייני הבקשה (סכום, מועד הגשה, קטגוריה) דומים לבקשות שנדחו בעבר במערכת.");
                }

                pendingInsights[pr.RequestId.ToString()] = new
                {
                    approval_probability = Math.Round(proba, 4),
                    approval_label       = proba >= 0.5 ? "צפי לאישור" : "מומלץ לבדוק בקפידה",
                    expected_amount      = Math.Round(exp, 2),
                    amount_ratio         = Math.Round(ratio, 2),
                    amount_flag          = amtFlag,
                    reasons,
                };
            }
        }

        // 10. Build projects output ─────────────────────────────────────
        var projectsOut = new Dictionary<string, object>();
        foreach (var proj in rawProj)
        {
            double score = riskScores.TryGetValue(proj.ProjectId, out double s) ? s : 0.0;
            int    cluster = projCluster.TryGetValue(proj.ProjectId, out int c) ? c : -1;
            double budgetUtil = 0;
            if (projGroups.TryGetValue(proj.ProjectId, out var prs))
            {
                double totalApproved = prs.Where(r => r.ApprovedLabel == 1).Sum(r => r.RequestedAmount);
                budgetUtil = proj.TotalBudget > 0 ? totalApproved / proj.TotalBudget : 0;
            }

            projectsOut[proj.ProjectId.ToString()] = new
            {
                risk_score        = Math.Round(score, 4),
                risk_label        = score >= 0.5 ? "בסיכון" : "תקין",
                cluster,
                cluster_label     = cluster >= 0 && clusterLabels.TryGetValue(cluster, out string? lbl) ? lbl : "לא ידוע",
                budget_utilization = Math.Round(budgetUtil, 4),
            };
        }

        // 11. Build clusters output ────────────────────────────────────
        var clustersOut = new Dictionary<string, object>();
        foreach (var (cId, avgUtil) in clusterAvgUtil)
        {
            clustersOut[cId.ToString()] = new
            {
                label = clusterLabels.TryGetValue(cId, out string? l) ? l : "לא ידוע",
                avg_budget_utilization = Math.Round(avgUtil, 4),
                project_ids = clusterProjs.TryGetValue(cId, out var pids) ? pids : new List<int>(),
            };
        }

        // 12. Serialize & return ─────────────────────────────────────────
        return JsonSerializer.Serialize(
            new { projects = projectsOut, clusters = clustersOut, pending_requests = pendingInsights },
            new JsonSerializerOptions { WriteIndented = false });
    }
}
