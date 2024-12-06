import React, { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import {
	getGitlabMRbyId,
	getMRDiff,
	getTransformedMRInfo
} from '../utils/gitlabUtils'
import PhabricatorAPI from '../utils/phabricatorUtils'
import { useLocation } from 'react-router-dom'
import {
	Box,
	Card,
	CardContent,
	Typography,
	Chip,
	Button,
	List,
	Link,
	ListItem,
	ListItemText,
	ListItemAvatar,
	Avatar,
	Paper,
	Tab,
	Tabs
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
	Person,
	Schedule,
	Code,
	Comment,
	AccountTree,
	BugReport,
	Source
} from '@mui/icons-material'
import { Decoration, Diff, Hunk, parseDiff } from 'react-diff-view'
import 'react-diff-view/style/index.css' // Import styles for react-diff-view
import mapStatusToIcon from '../utils/mapStatusToIcon'

const formatDate = (date) => {
	const options = {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	}
	return new Date(date).toLocaleDateString(undefined, options)
}

// TabPanel component for handling tab content
function TabPanel({ children, value, index, ...other }) {
	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`tabpanel-${index}`}
			{...other}
		>
			{value === index && <Box sx={{ p: 3 }}>{children}</Box>}
		</div>
	)
}

const RevisionDetail = () => {
	const location = useLocation()
	const [tabValue, setTabValue] = useState(0)
	const [revision, setRevision] = useState(
		JSON.parse(localStorage.getItem('revision'))
	)
	const [diffs, setDiffs] = useState([]) // Initialize as an empty array
	const [inlineComments, setInlineComments] = useState([]) // Store inline comments

	useEffect(() => {
		const fetchMR = async () => {
			let mr = {}
			if (location.state.revision.source === 'G') {
				const { projectId, iid } = location.state.revision
				mr = await getGitlabMRbyId(iid, projectId)
				const transformedMr = await getTransformedMRInfo(mr)
				localStorage.setItem('revision', JSON.stringify(transformedMr))
				setRevision(transformedMr)
				console.log('revision:', transformedMr)
			} else if (location.state.revision.source === 'P') {
				const { id } = location.state.revision
				const phabricatorConfig = {
					phabricatorUrl: localStorage.getItem('phabricatorUrl'),
					phabricatorToken: localStorage.getItem('phabricatorToken')
				}
				const phabricatorAPI = new PhabricatorAPI(phabricatorConfig)
				mr = await phabricatorAPI.getRevisionInfo(id)
				const transformedMr =
					await phabricatorAPI.getTransformedRevisionInfo(id)
				setRevision(transformedMr)
			}
			if (!mr) {
				console.error('Error fetching merge request')
			}
		}

		const fetchDiff = async () => {
			if (!revision) return
			try {
				const diffContent = await getMRDiff(
					revision.projectId,
					revision.iid || revision.id
				)
				setDiffs(diffContent)
				console.log('Diffssss:', diffs)

				const iComments = revision.comments.filter(
					(comment) => comment.type === 'DiffNote'
				)
				console.log('Comments:', iComments)
				setInlineComments(iComments)
			} catch (error) {
				console.error('Error fetching diff:', error)
				setDiffs([]) // Set an empty array if there's an error
			}
		}

		fetchMR()
		fetchDiff()
	}, [])

	const handleTabChange = (event, newValue) => {
		setTabValue(newValue)
	}

	const preprocessDiff = (diff, oldPath, newPath) => {
		// Add file headers if missing
		if (!diff.startsWith('---')) {
			return `--- ${oldPath || 'a/file'}\n+++ ${newPath || 'b/file'}\n${diff}`
		}
		return diff
	}

	const renderInlineComments = (lineNumber) => {
		// Filter comments for the current line
		const commentsForLine = inlineComments.filter(
			(comment) => comment.position.new_line === lineNumber
		)
		console.log('Comments for line:', commentsForLine)

		if (commentsForLine.length === 0) return null

		return (
			<Box sx={{ mt: 1, ml: 2, p: 1, borderLeft: '2px solid #ccc' }}>
				{commentsForLine.map((comment, index) => (
					<Box key={index} sx={{ mb: 1 }}>
						<Typography variant="body2" color="textSecondary">
							{comment.body}
						</Typography>
					</Box>
				))}
			</Box>
		)
	}

	if (!revision) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
				<Typography>Loading...</Typography>
			</Box>
		)
	}

	return (
		<Box sx={{ maxWidth: 1200, margin: 'auto', p: 3 }}>
			{/* Header Card */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Grid container spacing={2}>
						<Grid size={12}>
							<Typography variant="h5" component="h1">
								{revision.title}
							</Typography>
							<Box sx={{ mt: 1 }}>
								<Chip
									label={revision.status}
									color={
										revision.status === 'Accepted'
											? 'success'
											: 'default'
									}
									icon={mapStatusToIcon[revision.status]}
									sx={{ mr: 1 }}
								/>
								<Button target="_blank" href={revision.url}>
									<Chip
										icon={<Source />}
										label="Original"
										color="secondary"
										sx={{ mr: 1 }}
									/>
								</Button>
								{revision.jiraId && (
									<Button
										target="_blank"
										href={`https://emplifi.atlassian.net/browse/${revision.jiraId}`}
									>
										<Chip
											icon={<BugReport />}
											label={revision.jiraId}
											color="primary"
										/>
									</Button>
								)}
							</Box>
						</Grid>
						<Grid item xs={12} sm={6}>
							<Typography variant="body2" color="textSecondary">
								<Grid container spacing={1}>
									<Grid item>
										<Person />
									</Grid>
									<Grid item>
										{revision.author.name +
											' - ' +
											revision.author.username}
									</Grid>
								</Grid>
							</Typography>
							<Typography variant="body2" color="textSecondary">
								<Grid container spacing={1}>
									<Grid item>
										<Schedule />
									</Grid>
									<Grid item>
										{formatDate(revision.dateModified)}
									</Grid>
								</Grid>
							</Typography>
							<Typography variant="body2" color="textSecondary">
								<Grid container spacing={1}>
									<Grid item>
										<AccountTree />
									</Grid>
									<Grid item>{revision.project}</Grid>
								</Grid>
							</Typography>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Tabs */}
			<Paper sx={{ mb: 3 }}>
				<Tabs value={tabValue} onChange={handleTabChange}>
					<Tab label="Details" />
					<Tab label="Reviewers" />
					<Tab label="Comments" />
					<Tab label="Changes" />
				</Tabs>
			</Paper>

			{/* Tab Panels */}
			<TabPanel value={tabValue} index={0}>
				<Grid container spacing={3}>
					<Grid size={12} md={6}>
						<Card>
							<CardContent>
								<Typography variant="h6" gutterBottom>
									Summary
								</Typography>
								{revision.jiraId && (
									<Typography>
										<Link
											href={`https://emplifi.atlassian.net/browse/${revision.jiraId}`}
											targer="_blank"
										>
											https://emplifi.atlassian.net/browse/
											{revision.jiraId}
										</Link>
									</Typography>
								)}
								<Typography>
									{revision.summary || revision.description}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid size={12} md={6}>
						<Card>
							<CardContent>
								<Typography variant="h6" gutterBottom>
									Branch Information
								</Typography>
								<Typography>
									Branch: {revision.branch}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid size={12} md={6}>
						<Card>
							<CardContent>
								<Typography variant="h6" gutterBottom>
									Commits
								</Typography>
								<List>
									{revision.commits?.map((commit, index) => (
										<ListItem key={index}>
											<ListItemText
												primary={commit.message}
												// secondary={commit.identifier}
												secondary={
													commit.author.name +
													' - ' +
													formatDate(
														new Date(
															commit.author
																.epoch * 1000
														)
													)
												}
											/>
										</ListItem>
									))}
								</List>
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			</TabPanel>

			<TabPanel value={tabValue} index={1}>
				{/* Reviewers Tab */}
				<List>
					{revision.reviewers?.map((reviewer, index) => (
						<ListItem key={index}>
							<ListItemAvatar>
								<Avatar>
									<Person />
								</Avatar>
							</ListItemAvatar>
							<ListItemText
								primary={reviewer?.name}
								secondary={reviewer?.username}
							/>
						</ListItem>
					))}
				</List>
			</TabPanel>

			<TabPanel value={tabValue} index={2}>
				{/* Comments Tab */}
				<List>
					{revision.comments?.map((comment, index) => (
						<ListItem key={index}>
							<ListItemAvatar>
								<Avatar>
									<Comment />
								</Avatar>
							</ListItemAvatar>
							<ListItemText
								primary={
									<div
										dangerouslySetInnerHTML={{
											__html: DOMPurify.sanitize(
												marked(comment.body)
											)
										}}
									/>
								}
								secondary={
									comment.author.name +
									' - ' +
									comment.author.username +
									' - ' +
									formatDate(new Date(comment.created_at))
								}
							/>
						</ListItem>
					))}
				</List>
			</TabPanel>

			<TabPanel value={tabValue} index={3}>
				{/* Changes Tab */}
				{diffs.length > 0 ? (
					diffs.map((file, index) => {
						const processedDiff = preprocessDiff(
							file.diff,
							file.oldPath,
							file.newPath
						)

						let parsedDiff = []
						try {
							parsedDiff = parseDiff(processedDiff) // Safely parse the diff
						} catch (error) {
							console.error('Error parsing diff:', error)
						}
						// console.log('Parsed Diff:', parseDiff(diff))
						const hunks = parsedDiff?.[0]?.hunks || [] // Safely access hunks

						return (
							<Box key={index} sx={{ mb: 3 }}>
								{/* Display file paths */}
								<Typography variant="h8" gutterBottom>
									<b>{file.oldPath}</b> →{' '}
									<b>{file.newPath}</b>
								</Typography>
								{/* Render the diff for the file */}
								{hunks.length > 0 ? (
									<Diff
										viewType="split"
										diffType="modify"
										hunks={hunks}
										key={file.newPath}
									>
										{(hunks) =>
											hunks.map((hunk) => (
												<>
													<Decoration
														key={
															'dec-' +
															hunk.content
														}
													>
														{hunk.content}
													</Decoration>
													<Hunk
														key={hunk.content}
														hunk={hunk}
														decoration={(
															lineNumber
														) => {
															console.log(
																'Decoration called for line:',
																lineNumber
															)
															return renderInlineComments(
																lineNumber
															)
														}}
													/>
												</>
											))
										}
									</Diff>
								) : (
									<Typography color="textSecondary">
										No changes available for this file.
									</Typography>
								)}
							</Box>
						)
					})
				) : (
					<Typography>No changes available.</Typography>
				)}
			</TabPanel>
		</Box>
	)
}

export default RevisionDetail
