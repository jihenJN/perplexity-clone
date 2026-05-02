
import React from 'react'
import SourceList from './SourceList';
import DisplaySummary from './DisplaySummary';
import FollowUpList from './FollowUpList';

function AnswerDisplay({chat,loadingSearch,aiResp, isStreaming , followUps, onFollowUp }) {
  return (
    <div>
    <SourceList WebResult={chat?.searchResult} loadingSearch={loadingSearch} />
    <DisplaySummary aiResp={aiResp} isStreaming={isStreaming}/>
     {!isStreaming && followUps?.length > 0 && (
        <FollowUpList followUps={followUps} onSelect={onFollowUp} />
      )}
   
    </div>
  )
}

export default AnswerDisplay