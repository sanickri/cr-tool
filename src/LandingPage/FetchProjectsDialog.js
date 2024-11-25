import React from 'react'
import {
	getGitlabProjects,
	getProjectsByIds,
	getStarredGitlabProjects,
	getTransformedGitlabMRs
} from '../utils/gitlabUtils'
import {
	Button,
	TextField,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import DownloadIcon from '@mui/icons-material/Download'

function FetchProjectsDialog({
	setFetchDialogOpen,
	fetchDialogOpen,
	projectIds,
	setProjectIds,
	updateRevisionsForSource,
	setHasGitProjects,
	setIsFetching
}) {
	const closeFetchDialog = () => {
		setFetchDialogOpen(false)
	}

	const handleFetchGitProjects = async () => {
		setIsFetching(true)
		const projects = await getGitlabProjects()
		localStorage.setItem('gitProjects', JSON.stringify(projects))
		console.log('Git Projects:', projects)
		setHasGitProjects(true)
		setIsFetching(false)
		const revs = await getTransformedGitlabMRs()
		updateRevisionsForSource(0, revs)
		setFetchDialogOpen(false)
	}

	const handleFetchStarredGitProjects = async (byIds, starred) => {
		setIsFetching(true)
		const projects = await getStarredGitlabProjects()
		localStorage.setItem('gitProjects', JSON.stringify(projects))
		console.log('Git Projectsaa:', projects)
		setHasGitProjects(true)
		setIsFetching(false)
		const revs = await getTransformedGitlabMRs()
		updateRevisionsForSource(0, revs)
		setFetchDialogOpen(false)
	}

	const handleFetchProjectsByIds = async () => {
		setIsFetching(true)
		const projects = await getProjectsByIds(projectIds)
		localStorage.setItem('gitProjects', JSON.stringify(projects))
		console.log('Git Projects:', projects)
		setHasGitProjects(true)
		setIsFetching(false)
		const revs = await getTransformedGitlabMRs()
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

	return (
		<Dialog open={fetchDialogOpen} onClose={closeFetchDialog}>
			<DialogTitle>GitLab Projects</DialogTitle>
			<DialogContent>
				<Grid container spacing={1}>
					<Grid size={12}>
						<TextField
							label="Project IDs"
							placeholder="Enter project IDs separated by commas"
							value={projectIds}
							onChange={handleInputChange}
						/>
					</Grid>
					<Grid size={3}>
						<Button
							variant="contained"
							sx={{
								backgroundColor: '#F05032',
								'&:hover': {
									backgroundColor: '#D9432A'
								}
							}}
							onClick={handleFetchProjectsByIds}
							startIcon={<DownloadIcon />}
						>
							by IDs
						</Button>
					</Grid>
					<Grid size={3}>
						<Button
							variant="contained"
							sx={{
								backgroundColor: '#F05032',
								'&:hover': {
									backgroundColor: '#D9432A'
								}
							}}
							onClick={handleFetchStarredGitProjects}
							startIcon={<DownloadIcon />}
						>
							starred
						</Button>
					</Grid>
					<Grid size={3}>
						<Button
							variant="contained"
							sx={{
								backgroundColor: '#F05032',
								'&:hover': {
									backgroundColor: '#D9432A'
								}
							}}
							onClick={handleFetchGitProjects}
							startIcon={<DownloadIcon />}
						>
							All
						</Button>
					</Grid>
				</Grid>
			</DialogContent>
			<DialogActions>
				<Button onClick={closeFetchDialog} color="primary">
					Close
				</Button>
			</DialogActions>
		</Dialog>
	)
}

export default FetchProjectsDialog
