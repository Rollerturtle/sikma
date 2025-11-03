// src/components/datatable/SearchableDropdown.tsx
import React, { useState, useEffect, useRef } from 'react';

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className="relative z-50">
      <div 
        className={`w-full px-3 py-2 border rounded-md cursor-pointer flex justify-between items-center ${
          disabled ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`truncate ${value ? 'text-gray-800' : 'text-gray-500'}`}>
          {value || placeholder}
        </span>
        {!disabled && (
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {isOpen && !disabled && (
        <div 
          className="absolute z-[9999] w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto"
          style={{ zIndex: 9999 }} // <-- Tambahkan ini untuk memastikan z-index tinggi
        >
          <input
            type="text"
            className="sticky top-0 w-full px-3 py-2 border-b border-gray-200 outline-none bg-white"
            placeholder={`Cari ${placeholder}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={index}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                  option === value ? 'bg-blue-100' : ''
                }`}
                onClick={() => handleSelect(option)}
              >
                {option}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500 italic">Tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;