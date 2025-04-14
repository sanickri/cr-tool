import React, { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import {
	getGitlabMRbyId,
	getMRDiff,
	getTransformedMRInfo
} from '../utils/gitlabUtils.js'
import PhabricatorAPI from '../utils/phabricatorUtils.js'
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
	Accordion,
	AccordionSummary,
	AccordionDetails,
	IconButton,
	TextField,
	Tooltip,
	Switch,
	Modal,
	Grid,
	Tabs,
	Tab
} from '@mui/material'
import {
	Person,
	Schedule,
	Comment,
	AccountTree,
	BugReport,
	Source,
	ExpandMore,
	ThumbUp,
	AddComment,
	ThumbDown
} from '@mui/icons-material'
import { Diff, Hunk, parseDiff } from 'react-diff-view'
import 'react-diff-view/style/index.css'
import mapStatusToIcon from '../utils/mapStatusToIcon.js'

const IS_READ_ONLY = true

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

const RevisionDetail = () => {
	const location = useLocation()
	const [revision, setRevision] = useState(null)
	const [diffs, setDiffs] = useState([])
	const [inlineComments, setInlineComments] = useState([])
	const [diffView, setDiffView] = useState(
		localStorage.getItem('diffView') || 'unified'
	)
	const [isAddingComment, setIsAddingComment] = useState(false)
	const [newComment, setNewComment] = useState({
		lineNumber: null,
		fileId: null,
		text: ''
	})
	const [visibleComments, setVisibleComments] = useState({})
	const [expandedCommentSections, setExpandedCommentSections] = useState({})
	// get source from url
	const source = location.pathname.split('/')[2]
	const [user, setUser] = useState(() => {
		try {
			if (source === 'G') {
				const gitlabUser = localStorage.getItem('gitlabUser')
				return gitlabUser ? JSON.parse(gitlabUser) : null
			} else if (source === 'P') {
				const phabUser = localStorage.getItem('phabUser')
				return phabUser ? JSON.parse(phabUser) : null
			}
			return null
		} catch (error) {
			console.error('Error parsing user data:', error)
			return null
		}
	})
	const [activeTab, setActiveTab] = useState(0)

	// Handle tab change
	const handleTabChange = (event, newValue) => {
		setActiveTab(newValue)
	}

	useEffect(() => {
		const fetchMR = async () => {
			try {
				let mr = {}
				if (location.state?.revision?.source === 'G') {
					const { projectId, iid } = location.state.revision
					mr = await getGitlabMRbyId(iid, projectId)
					const transformedMr = await getTransformedMRInfo(mr)
					setRevision(transformedMr)
					const diffContent = await getMRDiff(
						projectId,
						iid || transformedMr.id
					)
					setDiffs(diffContent)
					setInlineComments(transformedMr.inlineComments)
				} else if (location.state?.revision?.source === 'P') {
					const { id } = location.state.revision
					const phabricatorConfig = {
						phabricatorUrl: localStorage.getItem('phabricatorUrl'),
						phabricatorToken:
							localStorage.getItem('phabricatorToken')
					}
					const phabricatorAPI = new PhabricatorAPI(phabricatorConfig)
					mr = await phabricatorAPI.getRevisionInfo(id)
					const transformedMr =
						await phabricatorAPI.getTransformedRevisionInfo(id)
					setRevision(transformedMr)
					setDiffs(transformedMr.diffs)
				}
				if (!mr) {
					console.error('Error fetching merge request')
				}
			} catch (error) {
				console.error('Error fetching data:', error)
			}
		}

		fetchMR()
	}, [location.state])

	const preprocessDiff = (diff, oldPath, newPath) => {
		if (!diff.startsWith('---')) {
			return `--- ${oldPath || 'a/file'}\n+++ ${newPath || 'b/file'}\n${diff}`
		}
		return diff
	}

	const handleDiffViewChange = (event) => {
		if (diffView === 'split') {
			setDiffView('unified')
			localStorage.setItem('diffView', 'unified')
		} else {
			setDiffView('split')
			localStorage.setItem('diffView', 'split')
		}
	}

	const handleAddComment = (line, fileId) => {
		const lineNumber = line.change.lineNumber
		setNewComment({ lineNumber, fileId, text: '' })
		setIsAddingComment(true)
	}

	const handleAcceptRevision = (id) => {
		console.log('Accepting revision:', id)
		const newRevision = {
			...revision,
			status: 'Accepted'
		}
		setRevision(newRevision)
	}

	const saveNewComment = () => {
		if (!newComment.text.trim()) return

		const newCommentObj = {
			position: {
				new_line: newComment.lineNumber,
				new_path: newComment.fileId, // Make sure this matches the file path
				old_path: newComment.fileId
			},
			body: newComment.text,
			author: {
				name: user.name,
				username: user.username
			},
			created_at: new Date().toISOString(),
			type: 'DiffNote'
		}

		console.log('Saving new comment:', newCommentObj)
		setInlineComments((prevComments) => {
			const updatedComments = [...prevComments, newCommentObj]
			console.log('Updated comments:', updatedComments)
			return updatedComments
		})

		setNewComment({ lineNumber: null, fileId: null, text: '' })
		setIsAddingComment(false)
	}

	const toggleCommentVisibility = (lineNumber, fileId) => {
		const key = `${fileId}-${lineNumber}`
		setVisibleComments((prev) => ({
			...prev,
			[key]: !prev[key]
		}))
	}

	const toggleExpandComments = (key) => {
		setExpandedCommentSections((prev) => ({
			...prev,
			[key]: !prev[key]
		}))
	}

	const renderGutter = (line, fileId) => {
		const lineNumber = line.change?.lineNumber
		const hasComments = inlineComments.some(
			(comment) =>
				comment.position.new_path === fileId &&
				(comment.position.new_line === lineNumber ||
					comment.position.new_line === line.change.newLineNumber)
		)

		const key = `${fileId}-${lineNumber}`
		const commentsForLine = inlineComments.filter(
			(comment) =>
				comment.position.new_path === fileId &&
				(comment.position.new_line === lineNumber ||
					comment.position.new_line === line.change.newLineNumber)
		)

		// Sort comments by date, newest first
		const sortedComments = [...commentsForLine].sort(
			(a, b) => new Date(b.created_at) - new Date(a.created_at)
		)

		// Show only 5 newest comments by default
		const displayedComments = expandedCommentSections[key]
			? sortedComments
			: sortedComments.slice(0, 5)

		const hasMoreComments = sortedComments.length > 5

		if (diffView === 'unified' && line.side === 'old') {
			return line.renderDefault()
		}

		return (
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					minWidth: '48px',
					position: 'relative'
				}}
			>
				{line.renderDefault()} {/* Show line number */}
				<Box sx={{ ml: 1 }}>
					{hasComments ? (
						<Tooltip
							title={`${commentsForLine.length} comment(s). Click to ${visibleComments[key] ? 'hide' : 'show'}`}
						>
							<IconButton
								size="small"
								color="primary"
								onClick={() =>
									toggleCommentVisibility(lineNumber, fileId)
								}
								sx={{
									padding: '2px',
									backgroundColor: visibleComments[key]
										? 'rgba(25, 118, 210, 0.1)'
										: 'transparent'
								}}
							>
								<Comment fontSize="small" />
							</IconButton>
						</Tooltip>
					) : !IS_READ_ONLY ? (
						<Tooltip title="Add comment">
							<IconButton
								size="small"
								color="default"
								onClick={() => handleAddComment(line, fileId)}
								sx={{ padding: '2px' }}
							>
								<AddComment fontSize="small" />
							</IconButton>
						</Tooltip>
					) : null}
				</Box>
				{visibleComments[key] && hasComments && (
					<Box
						sx={{
							position: 'absolute',
							left: '100%',
							top: 0,
							zIndex: 1000,
							backgroundColor: 'white',
							boxShadow: 3,
							borderRadius: 1,
							p: 1,
							ml: 1
						}}
					>
						{sortedComments.slice(0, 5).map((comment, index) => (
							<Box
								key={index}
								sx={{
									p: 1,
									backgroundColor: '#f9f9f9',
									borderLeft: '3px solid #1976d2',
									my: 1,
									textAlign: 'left'
								}}
							>
								<Typography
									variant="caption"
									sx={{
										fontWeight: 'bold',
										display: 'block'
									}}
								>
									{comment.author.name} commented:
								</Typography>
								<Typography variant="body2">
									{comment.body}
								</Typography>
								<Typography
									variant="caption"
									color="textSecondary"
								>
									{formatDate(comment.created_at)}
								</Typography>
							</Box>
						))}

						{hasMoreComments && (
							<Button
								variant="text"
								color="primary"
								size="small"
								onClick={() => toggleExpandComments(key)}
								sx={{ my: 1, display: 'block' }}
							>
								{expandedCommentSections[key]
									? 'Show fewer comments'
									: `Show ${sortedComments.length - 5} more comments`}
							</Button>
						)}

						{expandedCommentSections[key] &&
							sortedComments.slice(5).map((comment, index) => (
								<Box
									key={index + 5}
									sx={{
										p: 1,
										backgroundColor: '#f9f9f9',
										borderLeft: '3px solid #1976d2',
										my: 1,
										textAlign: 'left'
									}}
								>
									<Typography
										variant="caption"
										sx={{
											fontWeight: 'bold',
											display: 'block'
										}}
									>
										{comment.author.name} commented:
									</Typography>
									<Typography variant="body2">
										{comment.body}
									</Typography>
									<Typography
										variant="caption"
										color="textSecondary"
									>
										{formatDate(comment.created_at)}
									</Typography>
								</Box>
							))}

						{!IS_READ_ONLY && (
							<Button
								variant="text"
								color="primary"
								size="small"
								onClick={() => handleAddComment(line, fileId)}
							>
								Add Comment
							</Button>
						)}
					</Box>
				)}
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
		<Box sx={{ margin: 'auto', p: 3 }}>
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Grid container spacing={2}>
						<Grid item xs={12}>
							<Typography variant="h5" component="h1">
								{revision.title}
							</Typography>
						</Grid>
						<Grid item xs={12}>
							<Box
								sx={{
									mt: 1,
									display: 'flex',
									alignItems: 'center',
									flexWrap: 'wrap',
									gap: 1
								}}
							>
								<Chip
									label={revision.status}
									color={
										revision.status === 'Accepted' ||
										revision.status === 'mergeable'
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
						<Grid
							item
							xs={12}
							container
							spacing={1}
							alignItems="center"
						>
							<Grid item>
								<Person fontSize="small" />
							</Grid>
							<Grid item>
								<Typography
									variant="body2"
									color="textSecondary"
								>
									{revision.author.name +
										' - ' +
										revision.author.username}
								</Typography>
							</Grid>
							<Grid item>
								<Schedule fontSize="small" />
							</Grid>
							<Grid item>
								<Typography
									variant="body2"
									color="textSecondary"
								>
									{formatDate(revision.dateModified)}
								</Typography>
							</Grid>
							<Grid item>
								<AccountTree fontSize="small" />
							</Grid>
							<Grid item>
								<Typography
									variant="body2"
									color="textSecondary"
								>
									{revision.project}
								</Typography>
							</Grid>
						</Grid>
					</Grid>
				</CardContent>
			</Card>
			<Grid container spacing={3}>
				<Grid item xs={12} md={6}>
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
							<Typography component="div">
								<div
									data-testid="revision-summary"
									dangerouslySetInnerHTML={{
										__html: DOMPurify.sanitize(
											marked(revision.summary)
										)
									}}
								/>
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} md={6}>
					<Card>
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Branch Information
							</Typography>
							<Typography>Branch: {revision.branch}</Typography>
							<Typography>
								Pipeline status:{' '}
								{mapStatusToIcon[revision.pipeline]}
							</Typography>
						</CardContent>
					</Card>

					<Grid item xs={12} md={12}>
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
				<Grid item xs={12}>
					<Card>
						{/* Tabs for Comments */}
						<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
							<Tabs
								value={activeTab}
								onChange={handleTabChange}
								aria-label="comments tabs"
							>
								<Tab label="Thread Comments" />
								<Tab label="Inline Comments" />
							</Tabs>
						</Box>

						{/* Thread Comments Panel */}
						{activeTab === 0 && (
							<CardContent>
								<List>
									{revision.comments?.map(
										(comment, index) => {
											// Only show regular comments in this section
											if (
												comment.type !== 'DiffNote' &&
												comment.type !== 'inline'
											) {
												// For regular thread comments
												const commentKey =
													'thread-comments'
												const threadComments =
													revision.comments
														.filter(
															(c) =>
																c.type !==
																	'DiffNote' &&
																c.type !==
																	'inline'
														)
														.sort(
															(a, b) =>
																new Date(
																	b.created_at
																) -
																new Date(
																	a.created_at
																)
														)

												// Display logic remains the same
												const newestFiveComments =
													threadComments.slice(0, 5)
												const olderComments =
													threadComments.slice(5)
												const hasMoreThreadComments =
													olderComments.length > 0

												const isInNewestGroup =
													newestFiveComments.includes(
														comment
													)
												const isInOlderGroup =
													expandedCommentSections[
														commentKey
													] &&
													olderComments.includes(
														comment
													)

												if (
													!isInNewestGroup &&
													!isInOlderGroup
												)
													return null

												const isLastOfNewestGroup =
													comment ===
													newestFiveComments[
														newestFiveComments.length -
															1
													]

												return (
													<React.Fragment key={index}>
														<ListItem>
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
																				marked(
																					comment.body
																				)
																			)
																		}}
																	/>
																}
																secondary={
																	comment
																		.author
																		.name +
																	' - ' +
																	comment
																		.author
																		.username +
																	' - ' +
																	formatDate(
																		new Date(
																			comment.created_at
																		)
																	)
																}
															/>
														</ListItem>
														{isLastOfNewestGroup &&
															hasMoreThreadComments && (
																<ListItem>
																	<Button
																		variant="text"
																		color="primary"
																		onClick={() =>
																			toggleExpandComments(
																				commentKey
																			)
																		}
																		sx={{
																			mx: 'auto'
																		}}
																	>
																		{expandedCommentSections[
																			commentKey
																		]
																			? 'Show fewer comments'
																			: `Show ${olderComments.length} more comments`}
																	</Button>
																</ListItem>
															)}
													</React.Fragment>
												)
											}
											return null // Skip inline comments in this tab
										}
									)}
								</List>
							</CardContent>
						)}

						{/* Inline Comments Panel */}
						{activeTab === 1 && (
							<CardContent>
								<List>
									{revision.comments?.map(
										(comment, index) => {
											// For inline comments only
											if (
												comment.type === 'DiffNote' ||
												comment.type === 'inline'
											) {
												const commentKey = `inline-${comment.position.new_path}-${comment.position.new_line}`
												const inlineFileComments =
													revision.comments
														.filter(
															(c) =>
																(c.type ===
																	'DiffNote' ||
																	c.type ===
																		'inline') &&
																c.position
																	.new_path ===
																	comment
																		.position
																		.new_path &&
																c.position
																	.new_line ===
																	comment
																		.position
																		.new_line
														)
														.sort(
															(a, b) =>
																new Date(
																	b.created_at
																) -
																new Date(
																	a.created_at
																)
														)

												// Display logic remains the same
												const newestFiveComments =
													inlineFileComments.slice(
														0,
														5
													)
												const olderComments =
													inlineFileComments.slice(5)
												const hasMoreInlineComments =
													olderComments.length > 0

												const isInNewestGroup =
													newestFiveComments.includes(
														comment
													)
												const isInOlderGroup =
													expandedCommentSections[
														commentKey
													] &&
													olderComments.includes(
														comment
													)

												if (
													!isInNewestGroup &&
													!isInOlderGroup
												)
													return null

												const isLastOfNewestGroup =
													comment ===
													newestFiveComments[
														newestFiveComments.length -
															1
													]

												return (
													<React.Fragment key={index}>
														<ListItem>
															<ListItemAvatar>
																<Avatar
																	onClick={() => {
																		toggleCommentVisibility(
																			comment
																				.position
																				.new_line,
																			comment
																				.position
																				.new_path
																		)
																	}}
																>
																	<Comment color="primary" />
																</Avatar>
															</ListItemAvatar>
															<ListItemText
																primary={
																	<div
																		dangerouslySetInnerHTML={{
																			__html: DOMPurify.sanitize(
																				marked(
																					comment.body
																				)
																			)
																		}}
																	/>
																}
																secondary={
																	<>
																		{
																			comment
																				.author
																				.name
																		}{' '}
																		-{' '}
																		{
																			comment
																				.author
																				.username
																		}{' '}
																		-{' '}
																		{formatDate(
																			new Date(
																				comment.created_at
																			)
																		)}
																		<br />
																		<Typography
																			variant="caption"
																			color="primary"
																			onClick={() => {
																				toggleCommentVisibility(
																					comment
																						.position
																						.new_line,
																					comment
																						.position
																						.new_path
																				)
																				// Optionally scroll to the diff view
																			}}
																			sx={{
																				cursor: 'pointer'
																			}}
																		>
																			File:{' '}
																			{
																				comment
																					.position
																					.new_path
																			}
																			,
																			Line:{' '}
																			{
																				comment
																					.position
																					.new_line
																			}
																		</Typography>
																	</>
																}
															/>
														</ListItem>
														{isLastOfNewestGroup &&
															hasMoreInlineComments && (
																<ListItem>
																	<Button
																		variant="text"
																		color="primary"
																		onClick={() =>
																			toggleExpandComments(
																				commentKey
																			)
																		}
																		sx={{
																			mx: 'auto'
																		}}
																	>
																		{expandedCommentSections[
																			commentKey
																		]
																			? 'Show fewer comments'
																			: `Show ${olderComments.length} more comments`}
																	</Button>
																</ListItem>
															)}
													</React.Fragment>
												)
											}
											return null
										}
									)}
								</List>
							</CardContent>
						)}
					</Card>
				</Grid>
				<Grid item xs={12}>
					<Card>
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Changes
							</Typography>
							<Grid item>
								<Typography>Change View</Typography>
							</Grid>
							<Grid item>
								<Switch
									color="secondary"
									onChange={handleDiffViewChange}
								/>
							</Grid>
							{diffs.length > 0 ? (
								diffs.map((file, index) => {
									const processedDiff = preprocessDiff(
										file.diff,
										file.oldPath,
										file.newPath
									)
									const accodionExpanded =
										diffs.length < 10 ? true : false

									let parsedDiff = []
									try {
										parsedDiff = parseDiff(processedDiff)
									} catch (error) {}
									const hunks = parsedDiff?.[0]?.hunks || []

									return (
										<Accordion
											key={index}
											sx={{ mb: 3 }}
											defaultExpanded={accodionExpanded}
										>
											<AccordionSummary
												expandIcon={<ExpandMore />}
												id={`diff-${file.newPath}`}
											>
												{file.isNewFile ? (
													<>
														<Chip
															label="New"
															color="success"
															sx={{ mr: 1 }}
														/>
														<Typography>
															<b>
																{file.newPath}
															</b>
														</Typography>
													</>
												) : file.isDeletedFile ? (
													<>
														<Chip
															label="Deleted"
															color="error"
															sx={{ mr: 1 }}
														/>
														<Typography>
															<b>
																{file.oldPath}
															</b>
														</Typography>
													</>
												) : file.isRenamedFile ? (
													<>
														<Chip
															label="Renamed"
															color="primary"
															sx={{ mr: 1 }}
														/>
														<Typography>
															<b>
																{file.oldPath}
															</b>{' '}
															→{' '}
															<b>
																{file.newPath}
															</b>
														</Typography>
													</>
												) : (
													<Typography>
														<b>{file.oldPath}</b>
													</Typography>
												)}
											</AccordionSummary>
											<AccordionDetails>
												{hunks.length > 0 ? (
													<Diff
														viewType={diffView}
														diffType="modify"
														hunks={hunks}
														renderGutter={(line) =>
															renderGutter(
																line,
																file.newPath
															)
														}
													>
														{(hunks) =>
															hunks.map(
																(hunk) => (
																	<Hunk
																		key={
																			hunk.content
																		}
																		hunk={
																			hunk
																		}
																	/>
																)
															)
														}
													</Diff>
												) : (
													<Typography>
														No code changes
														available for this file.
													</Typography>
												)}
											</AccordionDetails>
										</Accordion>
									)
								})
							) : (
								<Typography>No changes available.</Typography>
							)}
						</CardContent>
					</Card>
				</Grid>
				{!IS_READ_ONLY && (
					<Grid container spacing={3}>
						<Grid item>
							<Typography variant="h6" gutterBottom>
								Actions
							</Typography>
							<Button
								variant="contained"
								color="primary"
								startIcon={<Comment />}
							>
								Comment Revision
							</Button>
							<Button
								variant="contained"
								color="secondary"
								startIcon={<ThumbDown />}
								sx={{ ml: 1 }}
							>
								Request Changes
							</Button>
							<Button
								variant="contained"
								color="success"
								startIcon={<ThumbUp />}
								sx={{ ml: 1 }}
								onClick={() => {
									handleAcceptRevision(revision.id)
								}}
							>
								Approve Revision
							</Button>
						</Grid>
					</Grid>
				)}
			</Grid>

			{/* Modal for Adding Comments */}
			<Modal
				open={isAddingComment}
				onClose={() => setIsAddingComment(false)}
			>
				<Box
					sx={{
						p: 3,
						backgroundColor: 'white',
						margin: 'auto',
						width: 400
					}}
				>
					<Typography variant="h6">Add Comment</Typography>
					<TextField
						fullWidth
						multiline
						rows={4}
						value={newComment.text}
						onChange={(e) =>
							setNewComment({
								...newComment,
								text: e.target.value
							})
						}
						placeholder="Write your comment here..."
					/>
					<Box
						sx={{
							mt: 2,
							display: 'flex',
							justifyContent: 'flex-end'
						}}
					>
						<Button
							onClick={saveNewComment}
							variant="contained"
							color="primary"
						>
							Save
						</Button>
					</Box>
				</Box>
			</Modal>
		</Box>
	)
}

export default RevisionDetail
