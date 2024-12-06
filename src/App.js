import React, { useState } from 'react'
import LandingPage from './LandingPage/LandingPage'
import TopMenu from './LandingPage/TopMenu'
import { isGitlabTokenValid } from './utils/gitlabUtils'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RevisionDetail from './Revisions/RevisionDetail'
import RevisionSearch from './Revisions/RevisionSearch'

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
		<div className="App">
			<BrowserRouter>
				<TopMenu
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
							<LandingPage
								setHasGitProjects={setHasGitProjects}
								setIsPhabConnected={setIsPhabConnected}
								setIsGitConnected={setIsGitConnected}
								setProjectIds={setProjectIds}
								projectIds={projectIds}
								setRevisions={setRevisions}
								revisions={revisions}
								isGitConnected={isGitConnected}
								isPhabConnected={isPhabConnected}
								setGitlabDialogOpen={setGitlabDialogOpen}
								gitlabDialogOpen={gitlabDialogOpen}
								setPhabricatorDialogOpen={
									setPhabricatorDialogOpen
								}
								phabricatorDialogOpen={phabricatorDialogOpen}
								hasGitProjects={hasGitProjects}
								setFetchDialogOpen={setFetchDialogOpen}
								fetchDialogOpen={fetchDialogOpen}
							/>
						}
					/>
					<Route
						path={`/detail/:detailID`}
						element={<RevisionDetail />}
					/>
					<Route path="/detail" element={<RevisionSearch />} />
				</Routes>
			</BrowserRouter>
		</div>
	)
}

export default App
