import React, { useState, useEffect } from 'react'
import {
	Button,
	Alert,
	CircularProgress,
	TextField,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions
} from '@mui/material'
import ConnectionStatus from './ConnectionStatus'
import Revisions from '../Revisions/Revisions'
import {
	gitlabCallback,
	getMyGitlabUser,
	getGitlabProjects,
	fetchProjectsByIds,
	getGitlabMRsFromAllProjects
} from '../utils/gitlabUtils'
import PhabricatorAPI from '../utils/phabricatorUtils'

const LandingPage = () => {
	const [gitlabDialogOpen, setGitlabDialogOpen] = useState(false)
	const [phabricatorDialogOpen, setPhabricatorDialogOpen] = useState(false)
	const [fetchDialogOpen, setFetchDialogOpen] = useState(false)

	const [gitlabUrl, setGitlabUrl] = useState(
		process.env.REACT_APP_GITLAB_URL || ''
	)
	const [phabricatorToken, setPhabricatorToken] = useState(
		process.env.REACT_APP_PHABRICATOR_API_TOKEN || ''
	)
	const [phabricatorUrl, setPhabricatorUrl] = useState(
		process.env.REACT_APP_PHABRICATOR_URL || ''
	)

	const [isGitConnected, setIsGitConnected] = useState(
		localStorage.getItem('gitlabUser') ? true : false
	)
	const [isPhabConnected, setIsPhabConnected] = useState(false)

	// Update the starting state if you'r adding more data sources
	const [revisions, setRevisions] = useState([[], []])
	const [allPhabUsers, setAllPhabUsers] = useState([])
	const [projectIds, setProjectIds] = useState('')
	const [hasGitProjects, setHasGitProjects] = useState(
		localStorage.getItem('gitProjects') ? true : false
	)
	const [isGitLoaded, setIsGitLoaded] = useState(false)
	const [isFetching, setIsFetching] = useState(false)

	const updateRevisionsForSource = (sourceIndex, newRevs) => {
		setRevisions((prevRevisions) => {
			const updatedRevisions = [...prevRevisions]
			const existingRevs = updatedRevisions[sourceIndex]
			const uniqueNewRevs = newRevs.filter(
				(newRev) => !existingRevs.some((rev) => rev.id === newRev.id)
			)
			updatedRevisions[sourceIndex] = [...existingRevs, ...uniqueNewRevs]
			return updatedRevisions
		})
	}

	useEffect(() => {
		const handleGitlabCallback = async (setIsGitConnected, revisions) => {
			const urlParams = new URLSearchParams(window.location.search)
			const code = urlParams.get('code')
			let user = localStorage.getItem('gitlabUser')
			if (code) {
				try {
					const token = await gitlabCallback(code)
					if (token) {
						setIsGitConnected(true)
						window.history.replaceState(
							{},
							document.title,
							window.location.pathname
						)
					}
					user = await getMyGitlabUser()
				} catch (error) {
					console.error('Error during Gitlab callback:', error)
				}
			}
			if (user) {
				const revs = await getGitlabMRsFromAllProjects()
				updateRevisionsForSource(0, revs)
			}
		}

		handleGitlabCallback(setIsGitConnected, revisions, setRevisions)
		setIsGitLoaded(true)

		const savedUrl = localStorage.getItem('phabricatorUrl')
		const savedToken = localStorage.getItem('phabricatorToken')

		const handleFetchPhabricatorRevisions = async () => {
			const phabricatorConfig = {
				phabricatorUrl: phabricatorUrl,
				phabricatorToken: phabricatorToken
			}
			const phabricatorAPI = new PhabricatorAPI(phabricatorConfig)
			const revs = await phabricatorAPI.getRevisions()
			updateRevisionsForSource(1, revs)
			setIsPhabConnected(true)
		}

		if (savedUrl && savedToken) {
			setPhabricatorUrl(savedUrl)
			setPhabricatorToken(savedToken)
			handleFetchPhabricatorRevisions()
		}
	}, [])

	const handleFetchGitProjects = async () => {
		setIsFetching(true)
		const projects = await getGitlabProjects()
		localStorage.setItem('gitProjects', JSON.stringify(projects))
		console.log('Git Projects:', projects)
		setHasGitProjects(true)
		setIsFetching(false)
		const revs = await getGitlabMRsFromAllProjects()
		updateRevisionsForSource(0, revs)
		setFetchDialogOpen(false)
	}

	const handleFetchProjectsByIds = async () => {
		setIsFetching(true)
		const projects = await fetchProjectsByIds(projectIds)
		localStorage.setItem('gitProjects', JSON.stringify(projects))
		console.log('Git Projects:', projects)
		setHasGitProjects(true)
		setIsFetching(false)
		const revs = await getGitlabMRsFromAllProjects()
		updateRevisionsForSource(0, revs)
		setFetchDialogOpen(false)
	}

	const handleInputChange = (event) => {
		const value = event.target.value
		if (/^[0-9,]*$/.test(value)) {
			setProjectIds(value)
		} else {
			console.warn('Invalid input: Only numbers and commas are allowed.')
		}
	}

	const handleDisconnect = () => {
		localStorage.clear()
		setIsGitConnected(false)
		setIsPhabConnected(false)
		setRevisions([[], []])
		setAllPhabUsers([])
		setHasGitProjects([])
	}

	const openFetchDialog = () => {
		setFetchDialogOpen(true)
	}

	const closeFetchDialog = () => {
		setFetchDialogOpen(false)
	}

	return (
		<>
			<ConnectionStatus
				isGitConnected={isGitConnected}
				setIsGitConnected={setIsGitConnected}
				isPhabConnected={isPhabConnected}
				setIsPhabConnected={setIsPhabConnected}
				setGitlabDialogOpen={setGitlabDialogOpen}
				setPhabricatorDialogOpen={setPhabricatorDialogOpen}
				gitlabDialogOpen={gitlabDialogOpen}
				phabricatorDialogOpen={phabricatorDialogOpen}
				gitlabUrl={gitlabUrl}
				setGitlabUrl={setGitlabUrl}
				phabricatorUrl={phabricatorUrl}
				setPhabricatorUrl={setPhabricatorUrl}
				phabricatorToken={phabricatorToken}
				setPhabricatorToken={setPhabricatorToken}
				updateRevisionsForSource={updateRevisionsForSource}
				setAllPhabUsers={setAllPhabUsers}
			/>
			{isGitConnected && !hasGitProjects && !isFetching && (
				<>
					<div style={{ textAlign: 'center', marginBottom: '50px' }}>
						<br />
						<Alert severity="info" color="warning">
							Since there can be a lot of projects and fetching
							can take a while, please fetch your projects now to
							see your revisions. You can refetch at any time.
						</Alert>
						<Button
							variant="contained"
							sx={{
								backgroundColor: '#F05032',
								'&:hover': {
									backgroundColor: '#D9432A'
								},
								marginTop: '20px'
							}}
							onClick={openFetchDialog}
						>
							Fetch Git Projects
						</Button>
					</div>
				</>
			)}
			{isFetching && (
				<div style={{ textAlign: 'center', marginBottom: '50px' }}>
					<Alert
						severity="info"
						color="warning"
						sx={{ margin: '20px' }}
					>
						Fetching Git projects, this may take a while, please
						wait...
					</Alert>
					<CircularProgress color="warning" />
				</div>
			)}
			{(isPhabConnected || (isGitConnected && hasGitProjects)) && (
				<>
					<div style={{ textAlign: 'center', marginBottom: '50px' }}>
						<Button
							variant="contained"
							sx={{
								backgroundColor: '#ed070b',
								'&:hover': {
									backgroundColor: '#9e0306'
								}
							}}
							onClick={handleDisconnect}
						>
							Disconnect
						</Button>
						<Button
							variant="contained"
							sx={{
								backgroundColor: '#F05032',
								'&:hover': {
									backgroundColor: '#D9432A'
								},
								marginLeft: '20px',
								display: isGitConnected
									? 'inline-block'
									: 'none'
							}}
							onClick={openFetchDialog}
						>
							Refetch Git Projects
						</Button>
					</div>
					<Revisions
						revisions={revisions}
						allPhabUsers={allPhabUsers}
					/>
				</>
			)}
			{/* Fetch Dialog */}
			<Dialog open={fetchDialogOpen} onClose={closeFetchDialog}>
				<DialogTitle>GitLab Projects</DialogTitle>
				<DialogContent>
					<Button
						variant="contained"
						sx={{
							backgroundColor: '#F05032',
							'&:hover': {
								backgroundColor: '#D9432A'
							},
							marginBottom: '20px'
						}}
						onClick={handleFetchGitProjects}
					>
						Fetch All Projects
					</Button>
					<TextField
						label="Project IDs"
						placeholder="Enter project IDs separated by commas"
						value={projectIds}
						onChange={handleInputChange}
						sx={{ marginBottom: '20px', width: '100%' }}
					/>
					<Button
						variant="contained"
						sx={{
							backgroundColor: '#F05032',
							'&:hover': {
								backgroundColor: '#D9432A'
							}
						}}
						onClick={handleFetchProjectsByIds}
					>
						Fetch Projects by IDs
					</Button>
				</DialogContent>
				<DialogActions>
					<Button onClick={closeFetchDialog} color="primary">
						Close
					</Button>
				</DialogActions>
			</Dialog>
		</>
	)
}

export default LandingPage
