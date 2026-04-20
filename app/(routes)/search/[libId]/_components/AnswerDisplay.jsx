
import React from 'react'
import SourceList from './SourceList';
import DisplaySummary from './DisplaySummary';

function AnswerDisplay({chat}) {
 // const WebResult = searchResult?.organic_results;
  return (
    <div>
    <SourceList WebResult={chat?.searchResult}/>
    <DisplaySummary aiResp={chat?.aiResp}/>
    </div>
  )
}

export default AnswerDisplay