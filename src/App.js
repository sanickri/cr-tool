import React, { useState } from 'react'
import LandingPage from './LandingPage/LandingPage.js'
import TopMenu from './LandingPage/TopMenu.js'
import { isGitlabTokenValid } from './utils/gitlabUtils.js'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RevisionDetail from './Revisions/RevisionDetail.js'
import RevisionSearch from './Revisions/RevisionSearch.js'
import AccountDetails from './AccountDetails/AccountDetails.js'
import ErrorBoundary from './utils/ErrorBoundary.js'
import GitlabDialog from './LandingPage/GitlabDialog.js'
import PhabricatorDialog from './LandingPage/PhabricatorDialog.js'
import FetchProjectsDialog from './LandingPage/FetchProjectsDialog.js'
import { Box } from '@mui/material'
import dayjs from 'dayjs'

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
		localStorage.getItem('phabricatorUrl') &&
			localStorage.getItem('phabricatorToken')
			? true
			: false
	)
	const [revisions, setRevisions] = useState([[], []])
	// eslint-disable-next-line no-unused-vars
	const [projectIds, setProjectIds] = useState(
		localStorage.getItem('gitProjectIds') || '' // Load from localStorage
	)
	const [hasGitProjects, setHasGitProjects] = useState(
		localStorage.getItem('gitProjects') ? true : false
	)
	// eslint-disable-next-line no-unused-vars
	const [isFetching, setIsFetching] = useState(false) // Add isFetching state

	// State for dialog configurations (moved from LandingPage)
	const [gitlabSecret, setGitlabSecret] = useState(
		localStorage.getItem('gitlabSecret') || '' // Default to empty string
	)
	const [gitlabAppId, setGitlabAppId] = useState(
		localStorage.getItem('gitlabAppId') || '' // Default to empty string
	)
	const [gitlabRedirectUri, setGitlabRedirectUri] = useState(
		localStorage.getItem('gitlabRedirectUri') || '' // Default to empty string
	)
	const [gitlabUrl, setGitlabUrl] = useState(
		localStorage.getItem('gitlabUrl') || '' // Default to empty string
	)
	const [gitlabExpirationDate, setGitlabExpirationDate] = useState(dayjs())
	const [phabricatorToken, setPhabricatorToken] = useState(
		localStorage.getItem('phabricatorToken') || '' // Default to empty string
	)
	const [phabricatorUrl, setPhabricatorUrl] = useState(
		localStorage.getItem('phabricatorUrl') || '' // Default to empty string
	)
	const [phabUserPHID, setPhabUserPHID] = useState(
		localStorage.getItem('phabUserPHID') || '' // Default to empty string
	)

	// Helper function (moved from LandingPage)
	const updateRevisionsForSource = (sourceIndex, newRevs) => {
		setRevisions((prevRevisions) => {
			const updatedRevisions = [...prevRevisions]
			const existingRevs = updatedRevisions[sourceIndex] || [] // Ensure exists
			const uniqueNewRevs = newRevs.filter(
				(newRev) => !existingRevs.some((rev) => rev.id === newRev.id)
			)
			updatedRevisions[sourceIndex] = [...existingRevs, ...uniqueNewRevs]
			return updatedRevisions
		})
	}

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
					<Box sx={{ pt: '64px' }}>
						<Routes>
							<Route
								path="/"
								element={
									<ErrorBoundary>
										<LandingPage
											data-testid="landing-page"
											setIsPhabConnected={
												setIsPhabConnected
											}
											setIsGitConnected={
												setIsGitConnected
											}
											setRevisions={setRevisions}
											revisions={revisions}
											isGitConnected={isGitConnected}
											isPhabConnected={isPhabConnected}
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
					</Box>
					<GitlabDialog
						data-testid="gitlab-dialog"
						setGitlabDialogOpen={setGitlabDialogOpen}
						gitlabDialogOpen={gitlabDialogOpen}
						gitlabUrl={gitlabUrl}
						setGitlabUrl={setGitlabUrl}
						gitlabSecret={gitlabSecret}
						setGitlabSecret={setGitlabSecret}
						gitlabAppId={gitlabAppId}
						setGitlabAppId={setGitlabAppId}
						gitlabRedirectUri={gitlabRedirectUri}
						setGitlabRedirectUri={setGitlabRedirectUri}
						gitlabExpirationDate={gitlabExpirationDate}
						setGitlabExpirationDate={setGitlabExpirationDate}
					/>
					<PhabricatorDialog
						data-testid="phabricator-dialog"
						setIsPhabConnected={setIsPhabConnected}
						setPhabricatorDialogOpen={setPhabricatorDialogOpen}
						phabricatorDialogOpen={phabricatorDialogOpen}
						phabricatorUrl={phabricatorUrl}
						setPhabricatorUrl={setPhabricatorUrl}
						phabricatorToken={phabricatorToken}
						setPhabricatorToken={setPhabricatorToken}
						updateRevisionsForSource={updateRevisionsForSource}
						setIsFetching={setIsFetching}
						phabUserPHID={phabUserPHID}
						setPhabUserPHID={setPhabUserPHID}
					/>
					<FetchProjectsDialog
						data-testid="fetch-projects-dialog"
						setFetchDialogOpen={setFetchDialogOpen}
						fetchDialogOpen={fetchDialogOpen}
						setHasGitProjects={setHasGitProjects}
						setProjectIds={setProjectIds}
						updateRevisionsForSource={updateRevisionsForSource}
						setIsFetching={setIsFetching}
					/>
				</BrowserRouter>
			</ErrorBoundary>
		</div>
	)
}

export default App
