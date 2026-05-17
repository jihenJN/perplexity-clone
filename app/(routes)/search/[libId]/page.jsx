"use client"

import React from "react"
import Header from "./_components/Header"
import DisplayResult from "./_components/DisplayResult"

// No DB fetch here — DisplayResult handles everything itself.
// Page renders immediately, stream starts on mount.

function SearchQueryResult() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-8 md:px-16 lg:px-28 xl:px-48 mt-6 sm:mt-10">
        <DisplayResult />
      </div>
    </div>
  )
}

export default SearchQueryResult
