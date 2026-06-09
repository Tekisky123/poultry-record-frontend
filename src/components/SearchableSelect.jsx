import Select from 'react-select';

export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option',
  required = false,
  className = ''
}) {
  const selectedOption = options.find(opt => opt.value === value) || null;

  return (
    <div className={`relative ${className}`}>
      <Select
        value={selectedOption}
        onChange={(selected) => onChange(selected ? selected.value : '')}
        options={options}
        placeholder={placeholder}
        isClearable
        className="text-sm react-select-container"
        classNamePrefix="react-select"
        styles={{
          control: (baseStyles) => ({
            ...baseStyles,
            borderColor: '#D1D5DB',
            borderRadius: '0.5rem',
            padding: '1px',
            boxShadow: 'none',
            '&:hover': { borderColor: '#9CA3AF' }
          }),
          menu: (baseStyles) => ({
            ...baseStyles,
            zIndex: 9999
          })
        }}
      />
      {/* Hidden input to support HTML5 validation (required) */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          tabIndex={-1}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        />
      )}
    </div>
  );
}
