import DatePicker, { registerLocale } from 'react-datepicker';
import { he } from 'date-fns/locale/he';

registerLocale('he', he);

const toDate = (str) => (str ? new Date(str) : null);
const toStr  = (d)   => (d   ? d.toISOString().split('T')[0] : '');

export default function HebrewDatePicker({
  value,
  onChange,
  placeholder = 'בחר תאריך',
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
    />
  );
}
