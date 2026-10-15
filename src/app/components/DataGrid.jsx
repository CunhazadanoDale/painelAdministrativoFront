import React, { useState } from 'react';
import './DataGrid.css';

function chaveDaLinha(row, rowIndex) {
  return row && row.id !== undefined && row.id !== null ? `id:${row.id}` : `indice:${rowIndex}`;
}

export function DataGrid({ columns, data, selectable = true }) {
  const [selectedRows, setSelectedRows] = useState(new Set());

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(data.map(chaveDaLinha)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (chave) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(chave)) {
      newSelected.delete(chave);
    } else {
      newSelected.add(chave);
    }
    setSelectedRows(newSelected);
  };

  if (!data || data.length === 0) {
    return (
      <div className="datagrid-container">
        <div className="datagrid-empty">Nenhum registro encontrado.</div>
      </div>
    );
  }

  return (
    <div className="datagrid-container">
      <table className="datagrid">
        <thead>
          <tr>
            {selectable && (
              <th className="datagrid-checkbox">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={data.length > 0 && data.every((row, i) => selectedRows.has(chaveDaLinha(row, i)))} 
                />
              </th>
            )}
            {columns.map((col, idx) => (
              <th key={idx} style={{ width: col.width || 'auto' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const chave = chaveDaLinha(row, rowIndex);
            return (
              <tr 
                key={chave} 
                className={selectedRows.has(chave) ? 'selected' : ''}
                onClick={() => selectable && handleSelectRow(chave)}
              >
                {selectable && (
                  <td className="datagrid-checkbox" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedRows.has(chave)}
                      onChange={() => handleSelectRow(chave)}
                    />
                  </td>
                )}
                {columns.map((col, colIndex) => (
                  <td key={colIndex}>
                    {col.render ? col.render(row[col.field], row) : row[col.field]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
