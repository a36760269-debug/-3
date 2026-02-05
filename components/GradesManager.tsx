import React from 'react';

/**
 * @deprecated
 * This component is deprecated and has been replaced by the full page implementation.
 * Please use 'pages/GradesManager.tsx' instead.
 */
const GradesManager = () => {
  return (
    <div className="p-4 text-center text-red-500 border border-red-300 rounded bg-red-50">
      <p>Error: Duplicate Component Detected.</p>
      <p>Please update imports to use <code>pages/GradesManager</code>.</p>
    </div>
  );
};

export default GradesManager;