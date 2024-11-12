import { useState, useEffect } from 'react'
import ConnectionStatus from './ConnectionStatus'
import Revisions from '../Revisions/Revisions'
import {
	handleGitlabCallback,
	getGitlabProjects,
	getGitlabMRsFromAllProjects
} from '../utils/gitlabUtils'
import { Button, Alert, CircularProgress } from '@mui/material'

const LandingPage = () => {
	const [gitlabDialogOpen, setGitlabDialogOpen] = useState(false)
	const [phabricatorDialogOpen, setPhabricatorDialogOpen] = useState(false)

	// Added .env variables for faster testing
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
	const [revisions, setRevisions] = useState([])
	const [allPhabUsers, setAllPhabUsers] = useState([])
	const [hasGitProjects, setHasGitProjects] = useState(
		localStorage.getItem('gitProjects') ? true : false
	)
	const [isFetching, setIsFetching] = useState(false)

	useEffect(() => {
		handleGitlabCallback(setIsGitConnected, setRevisions)
	}, [])

	const handleFetchGitProjects = async () => {
		setIsFetching(true)
		const projects = await getGitlabProjects()
		localStorage.setItem('gitProjects', JSON.stringify(projects))
		console.log('Git Projects:', projects)
		setHasGitProjects(true)
		setIsFetching(false)
		await getGitlabMRsFromAllProjects().then((mrs) => {
			setRevisions(mrs)
		})
	}

	const handleDisconnect = () => {
		//clear whole local storage
		localStorage.clear()
		setIsGitConnected(false)
		setIsPhabConnected(false)
		setRevisions([])
		setAllPhabUsers([])
		setHasGitProjects([])
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
				setRevisions={setRevisions}
				setAllPhabUsers={setAllPhabUsers}
			/>
			{isGitConnected && !hasGitProjects && !isFetching && (
				// fetch git projects here
				<>
					<div style={{ textAlign: 'center', marginBottom: '50px' }}>
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
							onClick={() => handleFetchGitProjects()}
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
							onClick={() => handleDisconnect()}
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
							onClick={() => handleFetchGitProjects()}
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
		</>
	)
}

export default LandingPage
