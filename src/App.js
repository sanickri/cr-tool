import React, { useState } from 'react'
import LandingPage from './LandingPage/LandingPage.js'
import TopMenu from './LandingPage/TopMenu.js'
import { isGitlabTokenValid } from './utils/gitlabUtils.js'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RevisionDetail from './Revisions/RevisionDetail.js'
import RevisionSearch from './Revisions/RevisionSearch.js'
import AccountDetails from './AccountDetails/AccountDetails.js'
import ErrorBoundary from './utils/ErrorBoundary.js'

const App = () => {
	const [gitlabDialogOpen, setGitlabDialogOpen] = useState(false)
	const [phabricatorDialogOpen, setPhabricatorDialogOpen] = useState(false)
	const [fetchDialogOpen, setFetchDialogOpen] = useState(false)

	const [isGitConnected, setIsGitConnected] = useState(
		localStorage.getItem('gitlabToken') && isGitlabTokenValid()
			? true
			: false
	)
	const [isPhabConnected, setIsPhabConnected] = useState(
		localStorage.getItem('phabricatorUrl' && 'phabricatorToken')
			? true
			: false
	)
	const [revisions, setRevisions] = useState([[], []])
	const [projectIds, setProjectIds] = useState('')
	const [hasGitProjects, setHasGitProjects] = useState(
		localStorage.getItem('gitProjects') ? true : false
	)

	return (
		<div className="App" data-testid="app-container">
			<ErrorBoundary>
				<BrowserRouter>
					<TopMenu
						data-testid="top-menu"
						setHasGitProjects={setHasGitProjects}
						setIsPhabConnected={setIsPhabConnected}
						setIsGitConnected={setIsGitConnected}
						setProjectIds={setProjectIds}
						setRevisions={setRevisions}
						isGitConnected={isGitConnected}
						isPhabConnected={isPhabConnected}
						setGitlabDialogOpen={setGitlabDialogOpen}
						setPhabricatorDialogOpen={setPhabricatorDialogOpen}
						hasGitProjects={hasGitProjects}
						setFetchDialogOpen={setFetchDialogOpen}
					/>
					<Routes>
						<Route
							path="/"
							element={
								<ErrorBoundary>
									<LandingPage
										data-testid="landing-page"
										setHasGitProjects={setHasGitProjects}
										setIsPhabConnected={setIsPhabConnected}
										setIsGitConnected={setIsGitConnected}
										setProjectIds={setProjectIds}
										projectIds={projectIds}
										setRevisions={setRevisions}
										revisions={revisions}
										isGitConnected={isGitConnected}
										isPhabConnected={isPhabConnected}
										setGitlabDialogOpen={
											setGitlabDialogOpen
										}
										gitlabDialogOpen={gitlabDialogOpen}
										setPhabricatorDialogOpen={
											setPhabricatorDialogOpen
										}
										phabricatorDialogOpen={
											phabricatorDialogOpen
										}
										hasGitProjects={hasGitProjects}
										setFetchDialogOpen={setFetchDialogOpen}
										fetchDialogOpen={fetchDialogOpen}
									/>
								</ErrorBoundary>
							}
						/>
						<Route
							path={`/detail/:source/:detailID`}
							element={
								<ErrorBoundary>
									<RevisionDetail />
								</ErrorBoundary>
							}
						/>
						<Route
							path="/detail"
							element={
								<ErrorBoundary>
									<RevisionSearch />
								</ErrorBoundary>
							}
						/>
						<Route
							path="/account"
							element={
								<ErrorBoundary>
									<AccountDetails />
								</ErrorBoundary>
							}
						/>
						<Route path="*" element={<h1>Not Found</h1>} />
					</Routes>
				</BrowserRouter>
			</ErrorBoundary>
		</div>
	)
}

export default App
