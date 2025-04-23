import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
	getGitlabProjects,
	getProjectsByIds,
	getStarredGitlabProjects,
	getTransformedGitlabMRs
} from '../utils/gitlabUtils.js'
import {
	Button,
	TextField,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Grid
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'

function FetchProjectsDialog({
	setFetchDialogOpen,
	fetchDialogOpen,
	updateRevisionsForSource,
	setHasGitProjects,
	setIsFetching
}) {
	// State for the input field
	const [inputProjectIds, setInputProjectIds] = useState('')

	// Initialize state from localStorage on mount
	useEffect(() => {
		const storedProjects = localStorage.getItem('gitProjects')
		if (storedProjects) {
			try {
				const projectIdsString = JSON.parse(storedProjects)
					.map((project) => project.id)
					.join(',')
				setInputProjectIds(projectIdsString)
				console.log('Initial Git Project IDs:', projectIdsString)
			} catch (error) {
				console.error(
					'Error parsing gitProjects from localStorage:',
					error
				)
				// Handle potential parsing error, maybe clear localStorage or set default
				localStorage.removeItem('gitProjects')
			}
		}
	}, []) // Empty dependency array ensures this runs only once on mount

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

	const handleFetchStarredGitProjects = async () => {
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
		// Use the state variable for IDs
		const projects = await getProjectsByIds(inputProjectIds)
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
		// Basic validation (allow only numbers and commas)
		if (/^[0-9,]*$/.test(value)) {
			setInputProjectIds(value) // Update state
		} else {
			console.warn('Invalid input: Only numbers and commas are allowed.')
		}
	}

	return (
		<Dialog
			data-testid="fetch-projects-dialog"
			open={fetchDialogOpen}
			onClose={closeFetchDialog}
		>
			<DialogTitle>GitLab Projects</DialogTitle>
			<DialogContent>
				<Grid container spacing={1}>
					<Grid item xs={12}>
						{' '}
						{/* Use item and xs for grid layout */}
						<TextField
							label="Project IDs (comma-separated)"
							value={inputProjectIds}
							onChange={handleInputChange}
							fullWidth
							margin="normal"
						/>
					</Grid>
					<Grid item xs={4}>
						{' '}
						{/* Use item and xs */}
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
							fullWidth
						>
							by IDs
						</Button>
					</Grid>
					<Grid item xs={4}>
						{' '}
						{/* Use item and xs */}
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
							fullWidth
						>
							starred
						</Button>
					</Grid>
					<Grid item xs={4}>
						{' '}
						{/* Use item and xs */}
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
							fullWidth
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

FetchProjectsDialog.propTypes = {
	setFetchDialogOpen: PropTypes.func.isRequired,
	fetchDialogOpen: PropTypes.bool.isRequired,
	updateRevisionsForSource: PropTypes.func.isRequired,
	setHasGitProjects: PropTypes.func.isRequired,
	setIsFetching: PropTypes.func.isRequired
}

export default FetchProjectsDialog
