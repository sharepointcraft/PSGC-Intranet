import * as React from 'react';
import type { IEmployeeSearchBoxProps } from './IEmployeeSearchBoxProps';

const EmployeeSearchBox: React.FC<IEmployeeSearchBoxProps> = ({ PageURL }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSearch = () => {
    if (searchTerm.trim() !== '') {
      const encodedQuery = encodeURIComponent(searchTerm.trim());
      window.open(`${PageURL}?q=${encodedQuery}`, '_blank');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
      <input
        type="text"
        placeholder="Search People..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyPress}
        style={{
          padding: '8px',
          fontSize: '14px',
          width: '250px',
          border: '1px solid rgb(169, 167, 164)',
          borderRadius: '4px'
        }}
      />
      <button
        onClick={handleSearch}
        style={{
          padding: '9px 16px',
          fontSize: '14px',
          backgroundColor: '#0b5268',
          color: '#fff ',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Search
      </button>
    </div>
  );
};

export default EmployeeSearchBox;
