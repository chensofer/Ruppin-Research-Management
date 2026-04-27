import DatePicker, { registerLocale } from 'react-datepicker';
import { he } from 'date-fns/locale/he';

registerLocale('he', he);

const toDate = (str) => (str ? new Date(str) : null);
const toStr  = (d)   => (d   ? d.toISOString().split('T')[0] : '');

const MONTHS_HE = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר',
];

const CUR_YEAR = new Date().getFullYear();
const YEARS    = Array.from({ length: 21 }, (_, i) => CUR_YEAR - 10 + i);

/* ── RTL Calendar Header ───────────────────────────────────────────────────── */
function CalendarHeader({
  date,
  decreaseMonth, increaseMonth,
  prevMonthButtonDisabled, nextMonthButtonDisabled,
  changeMonth, changeYear,
}) {
  return (
    <div className="hdp-header" dir="rtl">
      {/* Right side → previous month (RTL: past = right) */}
      <button
        type="button"
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        className="hdp-nav-btn"
        aria-label="חודש קודם"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Month + Year dropdowns */}
      <div className="hdp-selects">
        <select
          value={date.getMonth()}
          onChange={(e) => changeMonth(Number(e.target.value))}
          className="hdp-select"
        >
          {MONTHS_HE.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={date.getFullYear()}
          onChange={(e) => changeYear(Number(e.target.value))}
          className="hdp-select"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Left side → next month (RTL: future = left) */}
      <button
        type="button"
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        className="hdp-nav-btn"
        aria-label="חודש הבא"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function HebrewDatePicker({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  className = '',
  wrapperClassName = 'w-full',
  minDate,
  maxDate,
  disabled = false,
}) {
  return (
    <DatePicker
      locale="he"
      calendarStartDay={0}
      selected={toDate(value)}
      onChange={(d) => onChange(toStr(d))}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      className={className}
      wrapperClassName={wrapperClassName}
      minDate={toDate(minDate)}
      maxDate={toDate(maxDate)}
      disabled={disabled}
      popperPlacement="bottom-start"
      showPopperArrow={false}
      renderCustomHeader={(props) => <CalendarHeader {...props} />}
    />
  );
}
