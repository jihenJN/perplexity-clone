
import React from 'react'
import SourceList from './SourceList';
import DisplaySummary from './DisplaySummary';

function AnswerDisplay({chat,loadingSearch,aiResp, isStreaming }) {
  console.log(loadingSearch);
 // const WebResult = searchResult?.organic_results;
  return (
    <div>
    <SourceList WebResult={chat?.searchResult} loadingSearch={loadingSearch} />
    <DisplaySummary aiResp={aiResp} isStreaming={isStreaming}/>
    </div>
  )
}

export default AnswerDisplay