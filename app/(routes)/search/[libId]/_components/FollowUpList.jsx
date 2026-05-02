import React from 'react'
function FollowUpList({ followUps = [], onSelect }) {
  return (
    <div className="mt-8 border-t border-gray-200 pt-5">
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Follow-ups
      </p>
      <ul className="divide-y divide-gray-100">
        {followUps.map((q, i) => (
          <li key={i}>
            <button
              onClick={() => onSelect(q)}
              className="w-full flex items-center  gap-3 py-3 text-left text-sm text-teal-700 hover:text-teal-900 hover:bg-gray-50 transition-colors rounded-md px-2 group"
            >
              <span className="text-gray-400 group-hover:text-teal-500 text-base leading-none">
                ↳
              </span>
              <span>{q}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FollowUpList;