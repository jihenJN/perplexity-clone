import React from 'react'
import SourceList from './SourceList';
import DisplaySummary from './DisplaySummary';
import FollowUpList from './FollowUpList';
import LoadingSteps from './LoadingSteps';

function AnswerDisplay({ chat, loadingSearch, aiResp, isStreaming, followUps, onFollowUp }) {
  return (
    <div>
      <SourceList WebResult={chat?.searchResult} loadingSearch={loadingSearch} />

      {/* Loading steps sit between sources and the answer */}
      <LoadingSteps
        isLoadingSearch={loadingSearch}
        isStreaming={isStreaming}
        hasText={!!aiResp}
      />

      <DisplaySummary aiResp={aiResp} isStreaming={isStreaming} isLoadingSearch={loadingSearch} />

      {!isStreaming && followUps?.length > 0 && (
        <FollowUpList followUps={followUps} onSelect={onFollowUp} />
      )}
    </div>
  )
}

export default AnswerDisplay