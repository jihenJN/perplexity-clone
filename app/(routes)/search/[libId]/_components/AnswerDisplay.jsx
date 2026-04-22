
import React from 'react'
import SourceList from './SourceList';
import DisplaySummary from './DisplaySummary';

function AnswerDisplay({chat,loadingSearch}) {
  console.log(loadingSearch);
 // const WebResult = searchResult?.organic_results;
  return (
    <div>
    <SourceList WebResult={chat?.searchResult} loadingSearch={loadingSearch}/>
    <DisplaySummary aiResp={chat?.aiResp}/>
    </div>
  )
}

export default AnswerDisplay