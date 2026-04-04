import { useEffect, useState } from 'react';
import Stepper, { STEP_IDS } from './Stepper';
import StepDetails from './StepDetails';
import StepBudget from './StepBudget';
import StepTeam from './StepTeam';
import StepAssistants from './StepAssistants';
import StepExpenses from './StepExpenses';
import StepDocuments from './StepDocuments';
import StepSummary from './StepSummary';
import { createFullProject, uploadProjectFile } from '../../api/projectsApi';
import { getCenters } from '../../api/centersApi';

const INITIAL_DETAILS = {
  projectNameHe: '',
  projectNameEn: '',
  projectDescription: '',
  totalBudget: '',
  fundingSource: '',
  startDate: '',
  endDate: '',
  principalResearcherId: '',
  principalResearcherName: '',
  centerId: '',
};

export default function CreateProjectModal({ onClose, onCreated }) {
  const [step, setStep] = useState(STEP_IDS[0]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Step state
  const [details, setDetails]               = useState(INITIAL_DETAILS);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [teamMembers, setTeamMembers]       = useState([]);
  const [assistants, setAssistants]         = useState([]);
  const [expenses, setExpenses]             = useState([]);
  const [documents, setDocuments]           = useState([]);
  const [docFolders, setDocFolders]         = useState(['כללי']);
  const [centers, setCenters]               = useState([]);

  useEffect(() => {
    getCenters().then((res) => setCenters(res.data)).catch(() => {});
  }, []);

  const currentIndex = STEP_IDS.indexOf(step);
  const isFirst = currentIndex === 0;
  const isLast  = currentIndex === STEP_IDS.length - 1;

  // --- Validation ---
  const validateStep = () => {
    const errs = {};
    if (step === 'details') {
      if (!details.projectNameHe.trim()) errs.projectNameHe = 'שם המחקר הוא שדה חובה';
      if (!details.totalBudget || parseFloat(details.totalBudget) <= 0)
        errs.totalBudget = 'יש להזין תקציב תקין';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (!isLast) setStep(STEP_IDS[currentIndex + 1]);
  };

  const goBack = () => {
    if (!isFirst) setStep(STEP_IDS[currentIndex - 1]);
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      // Build the JSON payload (no files)
      const payload = {
        projectNameHe: details.projectNameHe,
        projectNameEn: details.projectNameEn || null,
        projectDescription: details.projectDescription || null,
        totalBudget: parseFloat(details.totalBudget) || null,
        fundingSource: details.fundingSource || null,
        startDate: details.startDate || null,
        endDate: details.endDate || null,
        principalResearcherId: details.principalResearcherId || null,
        centerId: details.centerId ? parseInt(details.centerId) : null,

        budgetCategories: budgetCategories
          .filter((c) => c.categoryName.trim())
          .map((c) => ({
            categoryName: c.categoryName,
            allocatedAmount: parseFloat(c.allocatedAmount) || null,
            notes: c.notes || null,
          })),

        teamMembers: teamMembers.map((m) => ({
          userId: m.userId,
          projectRole: m.projectRole,
        })),

        assistants: assistants.map((a) => ({
          assistantUserId: a.assistantUserId,
          isNewUser: a.isNewUser ?? false,
          firstName: a.firstName || null,
          lastName: a.lastName || null,
          email: a.email || null,
          role: a.role || null,
          salaryPerHour: parseFloat(a.salaryPerHour) || null,
        })),

        expenses: expenses
          .filter((e) => e.categoryName?.trim() && e.requestedAmount)
          .map((e) => ({
            requestTitle: e.categoryName || null,
            requestDescription: e.requestDescription || null,
            requestedAmount: parseFloat(e.requestedAmount) || null,
            requestDate: e.requestDate || null,
            categoryName: e.categoryName || null,
          })),
      };

      // Phase 1: create project
      const res = await createFullProject(payload);
      const projectId = res.data.projectId;

      // Phase 2: upload files
      for (const doc of documents) {
        const fd = new FormData();
        fd.append('file', doc.file);
        fd.append('folderName', doc.folder);
        await uploadProjectFile(projectId, fd);
      }

      onCreated(res.data);
    } catch (err) {
      const msg = err.response?.data?.message
        ?? err.response?.data?.title
        ?? 'אירעה שגיאה בעת יצירת המחקר. נסה שוב.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900">יצירת מחקר חדש</h2>
        </div>

        {/* Stepper */}
        <Stepper currentStep={step} />

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {submitError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {submitError}
            </div>
          )}

          {step === 'details' && (
            <StepDetails data={details} onChange={setDetails} errors={errors} />
          )}
          {step === 'budget' && (
            <StepBudget data={budgetCategories} onChange={setBudgetCategories} totalBudget={details.totalBudget} />
          )}
          {step === 'team' && (
            <StepTeam data={teamMembers} onChange={setTeamMembers} />
          )}
          {step === 'assistants' && (
            <StepAssistants data={assistants} onChange={setAssistants} />
          )}
          {step === 'expenses' && (
            <StepExpenses data={expenses} onChange={setExpenses} />
          )}
          {step === 'documents' && (
            <StepDocuments
              files={documents}
              folders={docFolders}
              onFilesChange={setDocuments}
              onFoldersChange={setDocFolders}
            />
          )}
          {step === 'summary' && (
            <StepSummary
              details={details}
              budgetCategories={budgetCategories}
              teamMembers={teamMembers}
              assistants={assistants}
              expenses={expenses}
              documents={documents}
              centers={centers}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={goBack}
            disabled={isFirst}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            קודם
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  יוצר מחקר...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  צור מחקר
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg transition-colors"
            >
              הבא
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
