import React, { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import {
	getGitlabMRbyId,
	getMRDiff,
	getTransformedMRInfo,
	addGitlabComment,
	addGitlabInlineComment,
	deleteGitlabComment
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
	Tooltip,
	Switch,
	Modal,
	Grid,
	Tabs,
	Tab,
	Fab,
	Popover,
	ListItemSecondaryAction
} from '@mui/material'
import {
	Person,
	Schedule,
	Comment,
	AccountTree,
	BugReport,
	Source,
	ExpandMore,
	AddComment,
	KeyboardArrowUp,
	DeleteForever as DeleteIcon
} from '@mui/icons-material'
import { Diff, Hunk, parseDiff } from 'react-diff-view'
import 'react-diff-view/style/index.css'
import mapStatusToIcon from '../utils/mapStatusToIcon.js'
import MDEditor from '@uiw/react-md-editor'

const MAX_DIFF_LINES_FOR_EXPAND = 200
const COMMENT_MAX_WIDTH =
	localStorage.getItem('diffView') === 'unified' ? '600px' : '400px'
const COMMENT_MIN_WIDTH =
	localStorage.getItem('diffView') === 'unified' ? '600px' : '400px'

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
	const [expandedAccordions, setExpandedAccordions] = useState({})
	// State for Popover
	const [popoverAnchorEl, setPopoverAnchorEl] = useState(null)
	// State to track expanded comment sections
	const [expandedCommentSections, setExpandedCommentSections] = useState({})
	const [activeCommentData, setActiveCommentData] = useState({
		comments: [],
		line: null,
		fileId: null
	})
	// get source from url
	const source = location.pathname.split('/')[2]
	const [user] = useState(() => {
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
	// State for scroll-to-top button visibility
	const [showScrollTopButton, setShowScrollTopButton] = useState(false)
	// State for general comment input
	const [generalCommentText, setGeneralCommentText] = useState('')
	const [isSubmittingComment, setIsSubmittingComment] = useState(false) // Add loading state
	const [isSubmittingInlineComment, setIsSubmittingInlineComment] =
		useState(false) // Add loading state for inline comments

	// Handle tab change
	const handleTabChange = (event, newValue) => {
		setActiveTab(newValue)
	}

	// Effect for scroll-to-top button visibility
	useEffect(() => {
		const checkScrollTop = () => {
			if (
				!showScrollTopButton &&
				window.pageYOffset > window.innerHeight
			) {
				setShowScrollTopButton(true)
			} else if (
				showScrollTopButton &&
				window.pageYOffset <= window.innerHeight
			) {
				setShowScrollTopButton(false)
			}
		}

		window.addEventListener('scroll', checkScrollTop)
		return () => window.removeEventListener('scroll', checkScrollTop)
	}, [showScrollTopButton])

	// Function to scroll to top
	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	useEffect(() => {
		const fetchMR = async () => {
			// Log the incoming revision identifier
			console.log(
				'[RevisionDetail] Fetching data for revision state:',
				location.state?.revision
			)
			const revisionId =
				location.state?.revision?.id || location.state?.revision?.iid
			console.log(`[RevisionDetail] Processing ID: ${revisionId}`)

			try {
				let mr = {}
				let transformedMr = null // Initialize transformedMr

				if (location.state?.revision?.source === 'G') {
					const { projectId, iid } = location.state.revision
					console.log(
						`[RevisionDetail] Fetching GitLab MR: projectId=${projectId}, iid=${iid}`
					)
					mr = await getGitlabMRbyId(iid, projectId)
					console.log(
						'[RevisionDetail] Raw GitLab MR fetched:',
						JSON.parse(JSON.stringify(mr))
					) // Log raw fetched data
					transformedMr = await getTransformedMRInfo(mr)
					console.log(
						'[RevisionDetail] Transformed GitLab MR:',
						JSON.parse(JSON.stringify(transformedMr))
					) // Log transformed data
				} else if (location.state?.revision?.source === 'P') {
					const { id } = location.state.revision
					console.log(
						`[RevisionDetail] Fetching Phabricator Revision: id=${id}`
					)
					const phabricatorConfig = {
						phabricatorUrl: localStorage.getItem('phabricatorUrl'),
						phabricatorToken:
							localStorage.getItem('phabricatorToken')
					}
					const phabricatorAPI = new PhabricatorAPI(phabricatorConfig)
					mr = await phabricatorAPI.getRevisionInfo(id) // Raw fetch
					console.log(
						'[RevisionDetail] Raw Phabricator Revision fetched:',
						JSON.parse(JSON.stringify(mr))
					) // Log raw fetched data
					transformedMr =
						await phabricatorAPI.getTransformedRevisionInfo(id) // Transform
					console.log(
						'[RevisionDetail] Transformed Phabricator Revision:',
						JSON.parse(JSON.stringify(transformedMr))
					) // Log transformed data
				}

				if (!transformedMr) {
					console.error(
						'[RevisionDetail] Error: Transformed data is missing or empty.',
						{
							source: location.state?.revision?.source,
							id: revisionId
						}
					)
					return // Stop if transformation failed
				}

				console.log(
					`[RevisionDetail] Attempting state updates for ID: ${revisionId}`
				)

				try {
					setRevision(transformedMr)
					console.log(
						`[RevisionDetail] setRevision called for ID: ${revisionId}`
					)

					// Handle diffs based on source
					if (location.state?.revision?.source === 'G') {
						const { projectId, iid } = location.state.revision
						const diffContent = await getMRDiff(
							projectId,
							iid || transformedMr.id
						)
						console.log(
							`[RevisionDetail] Fetched GitLab diffs for ID: ${revisionId}`,
							diffContent?.length
						)
						setDiffs(diffContent)
						setInlineComments(transformedMr.inlineComments || []) // Ensure inlineComments is always an array

						// Calculate initial accordion expansion state after diffs are fetched
						const initialExpansionState = {}
						diffContent?.forEach((file, index) => {
							// Add optional chaining
							const lineCount =
								(file.diff?.match(/\n/g) || []).length + 1 // Add optional chaining for diff
							if (lineCount <= MAX_DIFF_LINES_FOR_EXPAND) {
								initialExpansionState[index] = true
							}
						})
						setExpandedAccordions(initialExpansionState)
					} else if (location.state?.revision?.source === 'P') {
						console.log(
							`[RevisionDetail] Setting Phabricator diffs for ID: ${revisionId}`,
							transformedMr.diffs?.length
						)
						setDiffs(transformedMr.diffs || []) // Ensure diffs is always an array
						// Phabricator inline comments might be handled differently or part of diffs/comments
						setInlineComments(transformedMr.inlineComments || []) // Adjust based on Phabricator transform

						// Calculate initial accordion expansion state for Phabricator diffs
						const initialPhabExpansionState = {}
						transformedMr.diffs?.forEach((file, index) => {
							// Add optional chaining
							const lineCount =
								(file.diff?.match(/\n/g) || []).length + 1 // Add optional chaining for diff
							if (lineCount <= MAX_DIFF_LINES_FOR_EXPAND) {
								initialPhabExpansionState[index] = true
							}
						})
						setExpandedAccordions(initialPhabExpansionState)
					}
					console.log(
						`[RevisionDetail] State updates completed for ID: ${revisionId}`
					)
				} catch (stateUpdateError) {
					console.error(
						`[RevisionDetail] Error during state updates for ID: ${revisionId}:`,
						stateUpdateError
					)
					// Optionally clear state to prevent rendering with bad data
					// setRevision(null); setDiffs([]); setInlineComments([]);
				}
			} catch (error) {
				console.error(
					`[RevisionDetail] Error fetching or transforming data for ID: ${revisionId}:`,
					error
				)
			}
		}

		// Only fetch if we have revision data in location state
		if (location.state?.revision) {
			fetchMR()
		} else {
			console.warn(
				'[RevisionDetail] No revision data found in location state.'
			)
			// Optionally set loading to false or show an error message
		}
	}, [location.state]) // Dependency array remains the same

	const preprocessDiff = (diff, oldPath, newPath) => {
		if (!diff.startsWith('---')) {
			return `--- ${oldPath || 'a/file'}\n+++ ${newPath || 'b/file'}\n${diff}`
		}
		return diff
	}

	const handleDiffViewChange = () => {
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

	// Updated function to save inline comments via API
	const saveNewComment = async () => {
		// Make the function async
		if (
			!newComment.text.trim() ||
			!revision ||
			!revision.diff_refs ||
			isSubmittingInlineComment
		) {
			if (!revision?.diff_refs) {
				console.error(
					'Cannot save inline comment: Missing diff_refs in revision data.'
				)
				alert('Cannot save comment: Missing required diff information.')
			}
			return
		}

		setIsSubmittingInlineComment(true)

		// Find the corresponding diff file object to get old_path if needed
		const diffFile = diffs.find(
			(d) =>
				d.newPath === newComment.fileId ||
				d.oldPath === newComment.fileId
		)

		// Construct the position object for the API
		const position = {
			position_type: 'text',
			base_sha: revision.diff_refs.base_sha,
			start_sha: revision.diff_refs.start_sha,
			head_sha: revision.diff_refs.head_sha,
			old_path: diffFile?.oldPath || newComment.fileId, // Use oldPath from diff if available
			new_path: newComment.fileId,
			new_line: newComment.lineNumber,
			old_line: null // Set old_line to null if providing new_line, adjust if commenting on deletion
		}

		console.log(
			'[saveNewComment] Attempting to save inline comment via API:',
			{ body: newComment.text, position }
		)

		try {
			const addedComment = await addGitlabInlineComment(
				revision.projectId,
				revision.id, // Use revision.id (which is the iid)
				newComment.text,
				position
			)

			if (addedComment) {
				console.log(
					'[saveNewComment] API call successful, updating state:',
					addedComment
				)
				// Update local state with the comment returned by the API
				const newCommentForState = {
					...addedComment, // Use data from API response
					position: {
						// Ensure position structure matches local expectations if needed
						new_line: addedComment.position?.new_line,
						new_path: addedComment.position?.new_path,
						old_path: addedComment.position?.old_path,
						old_line: addedComment.position?.old_line,
						position_type: addedComment.position?.type // GitLab might return 'type' instead of 'position_type'
					},
					// Ensure author structure matches local expectations
					author: addedComment.author || {
						name: 'Unknown',
						username: 'unknown'
					},
					type: 'DiffNote' // Explicitly set type for local filtering
				}

				setInlineComments((prevComments) => {
					const updatedComments = [
						...(prevComments || []),
						newCommentForState
					]
					console.log(
						'[saveNewComment] Updated inline comments state:',
						updatedComments
					)
					return updatedComments
				})

				// Also update the main comments list in the revision state
				setRevision((prevRevision) => ({
					...prevRevision,
					comments: [
						...(prevRevision.comments || []),
						newCommentForState
					]
				}))

				setNewComment({ lineNumber: null, fileId: null, text: '' })
				setIsAddingComment(false) // Close the modal
			} else {
				console.error(
					'[saveNewComment] API call seemed successful, but no comment data returned.'
				)
				alert(
					'Comment might have been added, but response was unclear.'
				)
			}
		} catch (error) {
			console.error(
				'[saveNewComment] Failed to save inline comment:',
				error
			)
			alert(`Error saving inline comment: ${error.message}`)
		} finally {
			setIsSubmittingInlineComment(false)
		}
	}

	// Function to toggle comment section expansion
	const toggleExpandComments = (key) => {
		setExpandedCommentSections((prev) => ({
			...prev,
			[key]: !prev[key]
		}))
	}

	// Handler for deleting comments
	const handleDeleteComment = async (commentToDelete) => {
		// Double check authorization (user ID must match comment author ID)
		// Ensure both user?.id and commentToDelete?.author?.id exist and are comparable
		if (
			!user?.id ||
			!commentToDelete?.author?.id ||
			user.id !== commentToDelete.author.id
		) {
			alert('You can only delete your own comments.')
			return
		}

		if (window.confirm('Are you sure you want to delete this comment?')) {
			console.log(
				`[handleDeleteComment] Attempting to delete comment ID: ${commentToDelete.id}`
			)
			try {
				const success = await deleteGitlabComment(
					revision.projectId,
					revision.id, // MR iid
					commentToDelete.id // Note ID
				)

				if (success) {
					console.log(
						`[handleDeleteComment] API delete successful for comment ID: ${commentToDelete.id}`
					)
					// Update the main revision state
					setRevision((prevRevision) => {
						const updatedComments = prevRevision.comments.filter(
							(c) => c.id !== commentToDelete.id
						)
						return {
							...prevRevision,
							comments: updatedComments
						}
					})

					// If the deleted comment was inline, update inlineComments state as well
					if (commentToDelete.type === 'DiffNote') {
						setInlineComments((prevInline) =>
							prevInline.filter(
								(c) => c.id !== commentToDelete.id
							)
						)
					}

					// If the deleted comment was shown in the popover, update/close it
					if (
						popoverAnchorEl &&
						activeCommentData.comments.some(
							(c) => c.id === commentToDelete.id
						)
					) {
						const remainingPopoverComments =
							activeCommentData.comments.filter(
								(c) => c.id !== commentToDelete.id
							)
						if (remainingPopoverComments.length === 0) {
							handleCloseCommentPopover() // Close if no comments left
						} else {
							// Update popover data if needed (though it might auto-update due to state change)
							setActiveCommentData((prev) => ({
								...prev,
								comments: remainingPopoverComments
							}))
						}
					}

					alert('Comment deleted successfully.')
				} else {
					// Should not happen if API throws error, but as a safeguard
					console.error(
						`[handleDeleteComment] API indicated success=false for comment ID: ${commentToDelete.id}`
					)
					alert(
						'Failed to delete comment. API returned unexpected status.'
					)
				}
			} catch (error) {
				console.error(
					`[handleDeleteComment] Error deleting comment ID: ${commentToDelete.id}:`,
					error
				)
				alert(`Failed to delete comment: ${error.message}`)
			}
		}
	}

	// Function to handle submitting a general comment
	const handleSaveGeneralComment = async () => {
		if (!generalCommentText.trim() || !revision || isSubmittingComment)
			return

		// Ensure we have projectId and iid, especially for GitLab MRs
		if (source !== 'G' || !revision.projectId || !revision.id) {
			console.error(
				'Cannot add comment: Missing projectId or MR id (iid) in revision state.'
			)
			alert('Cannot add comment: Missing project or MR ID.')
			return
		}

		setIsSubmittingComment(true)
		try {
			const newCommentData = await addGitlabComment(
				revision.projectId,
				revision.id, // Use revision.id (which is the iid)
				generalCommentText
			)

			// Optimistically update the revision state
			setRevision((prevRevision) => {
				const updatedComments = [
					...(prevRevision.comments || []),
					{
						...newCommentData, // Use data returned from API
						// Ensure author format matches existing comments - API might already provide this structure
						author: newCommentData.author || {
							name: user?.name || 'Unknown',
							username: user?.username || 'unknown'
						},
						body: newCommentData.body,
						created_at: newCommentData.created_at,
						// Adjust type based on GitLab response (note vs DiffNote vs system)
						// GitLab uses 'Note' for regular comments and 'DiffNote' for inline.
						// system=true indicates system-generated notes.
						type:
							newCommentData.type ||
							(newCommentData.system ? 'system' : 'note')
					}
				]
				// Keep comments sorted by creation date
				updatedComments.sort(
					(a, b) => new Date(a.created_at) - new Date(b.created_at)
				)
				return {
					...prevRevision,
					comments: updatedComments
				}
			})

			setGeneralCommentText('') // Clear the input field
		} catch (error) {
			console.error('Failed to save general comment:', error)
			// Optionally: show an error message to the user
			alert(`Error saving comment: ${error.message}`)
		} finally {
			setIsSubmittingComment(false)
		}
	}

	const handleAccordionChange = (panelIndex) => (event, isExpanded) => {
		setExpandedAccordions((prev) => ({
			...prev,
			[panelIndex]: isExpanded
		}))
	}

	// Function to expand all accordions
	const expandAllAccordions = () => {
		const allExpanded = {}
		diffs.forEach((_, index) => {
			allExpanded[index] = true
		})
		setExpandedAccordions(allExpanded)
	}

	// Function to collapse all accordions
	const collapseAllAccordions = () => {
		setExpandedAccordions({})
	}

	// Function to handle click on inline comment in the list
	const handleInlineCommentClick = (comment) => {
		// Ensure comment position exists before trying to access properties
		if (!comment?.position?.new_path) {
			console.warn('Clicked comment missing position data:', comment)
			return
		}

		const filePath = comment.position.new_path
		// Find the index of the file in the diffs array
		const fileIndex = diffs.findIndex(
			(diff) => diff.newPath === filePath || diff.oldPath === filePath
		)

		if (fileIndex !== -1) {
			// Expand the corresponding accordion
			setExpandedAccordions((prev) => ({
				...prev,
				[fileIndex]: true
			}))

			// Scroll to the accordion
			// Use a slight delay to ensure the accordion has started expanding
			setTimeout(() => {
				const targetId = `diff-${filePath}`
				const element = document.getElementById(targetId)
				if (element) {
					element.scrollIntoView({
						behavior: 'smooth',
						block: 'start'
					})
				} else {
					console.warn(
						`Element with ID ${targetId} not found for scrolling.`
					)
				}
			}, 100) // 100ms delay
		} else {
			console.warn(`Diff file not found for path: ${filePath}`)
		}
	}

	// Handlers for Popover
	const handleOpenCommentPopover = (event, comments, line, fileId) => {
		setPopoverAnchorEl(event.currentTarget)
		setActiveCommentData({ comments, line, fileId })
	}

	const handleCloseCommentPopover = () => {
		setPopoverAnchorEl(null)
		// Optionally reset activeCommentData if needed, but not strictly necessary
		// setActiveCommentData({ comments: [], line: null, fileId: null });
	}

	const renderGutter = (line, fileId) => {
		const lineNumber = line.change?.lineNumber ?? line.change?.newLineNumber
		const commentsForLine =
			inlineComments?.filter(
				(comment) =>
					comment?.position?.new_path === fileId &&
					comment?.position?.new_line === lineNumber
			) || []

		const hasComments = commentsForLine.length > 0

		// Sort comments by date, oldest first
		const sortedComments = [...commentsForLine].sort(
			(a, b) => new Date(a.created_at) - new Date(b.created_at)
		)

		return (
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					minWidth: '48px', // Ensure enough space for icons
					position: 'relative' // Needed for absolute positioning of comment box
				}}
			>
				{line.renderDefault()} {/* Show line number */}
				<Box
					sx={{
						ml: 1,
						display: 'flex',
						alignItems: 'center',
						height: '100%'
					}}
				>
					{' '}
					{/* Align icons vertically */}
					{hasComments ? (
						<Tooltip
							title={`${commentsForLine.length} comment(s). Click to view.`}
						>
							<IconButton
								size="small"
								color="primary"
								onClick={(event) =>
									handleOpenCommentPopover(
										event,
										sortedComments,
										line,
										fileId
									)
								}
								sx={{
									padding: '2px'
								}}
							>
								<Comment fontSize="small" />
							</IconButton>
						</Tooltip>
					) : // Show button only if GitLab source
					source === 'G' ? (
						<Tooltip title="Add comment">
							<IconButton
								size="small"
								color="default"
								// Pass the correct fileId (newPath) and line info
								onClick={() => handleAddComment(line, fileId)}
								sx={{
									padding: '2px'
								}}
							>
								<AddComment fontSize="small" />
							</IconButton>
						</Tooltip>
					) : null}
				</Box>
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

	// Filter comments for display in tabs
	const threadComments =
		revision.comments?.filter(
			(comment) =>
				comment.type !== 'DiffNote' && comment.type !== 'inline'
		) || []
	const currentInlineComments =
		revision.comments?.filter(
			(comment) =>
				comment.type === 'DiffNote' || comment.type === 'inline'
		) || []

	return (
		<Box sx={{ margin: 'auto', p: 3 }}>
			{/* Header Card */}
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
									{revision.author?.name + // Use optional chaining
										' - ' +
										revision.author?.username}
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

			{/* Main Content Grid */}
			<Grid container spacing={3}>
				{/* Left Column: Summary, Branch, Commits */}
				<Grid item xs={12} md={6}>
					<Card sx={{ mb: 3 }}>
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Summary
							</Typography>
							{revision.jiraId && (
								<Typography>
									<Link
										href={`https://emplifi.atlassian.net/browse/${revision.jiraId}`}
										target="_blank" // Correct attribute name
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
											marked(revision.summary || '') // Handle potential null summary
										)
									}}
								/>
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} md={6}>
					<Card sx={{ mb: 3 }}>
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Branch Information
							</Typography>
							<Typography>Branch: {revision.branch}</Typography>
							<Typography>
								Pipeline status:{' '}
								{mapStatusToIcon[revision.pipeline] ||
									revision.pipeline}{' '}
								{/* Show status text if no icon */}
							</Typography>
						</CardContent>
					</Card>

					<Card>
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Commits
							</Typography>
							<List dense>
								{' '}
								{/* Use dense list for commits */}
								{revision.commits?.map((commit, index) => (
									<ListItem key={index} disableGutters>
										{' '}
										{/* Remove gutters */}
										<ListItemText
											primary={commit.message}
											secondary={
												(commit.author?.name ||
													'Unknown Author') + // Handle missing author
												' - ' +
												formatDate(
													new Date(
														commit.author?.epoch *
															1000 // Handle missing epoch
													)
												)
											}
										/>
									</ListItem>
								))}
								{(!revision.commits ||
									revision.commits.length === 0) && (
									<ListItem>
										<ListItemText primary="No commits found." />
									</ListItem>
								)}
							</List>
						</CardContent>
					</Card>
				</Grid>

				{/* NEW Full-width Grid item for Comments and Changed Files */}
				<Grid item xs={12} sx={{ mt: 3 }}>
					<Grid container spacing={3}>
						{/* Comments Card (now takes up more width on medium screens) */}
						<Grid item xs={12} md={8}>
							<Card sx={{ mb: 3 }}>
								{/* Tabs for Comments */}
								<Box
									sx={{
										borderBottom: 1,
										borderColor: 'divider'
									}}
								>
									<Tabs
										value={activeTab}
										onChange={handleTabChange}
										aria-label="comments tabs"
									>
										<Tab
											label={`Thread Comments (${threadComments.length})`}
										/>
										<Tab
											label={`Inline Comments (${currentInlineComments.length})`}
										/>
									</Tabs>
								</Box>

								{/* Thread Comments Panel */}
								{activeTab === 0 && (
									<CardContent>
										<List>
											{(() => {
												// Sort oldest first for display
												const sortedComments = [
													...threadComments
												].sort(
													(a, b) =>
														new Date(a.created_at) - // Sort oldest first
														new Date(b.created_at)
												)
												const totalCount =
													sortedComments.length
												const olderComments =
													totalCount > 5
														? sortedComments.slice(
																0,
																totalCount - 5
															) // All except last 5
														: []
												const newestFive =
													sortedComments.slice(
														Math.max(
															0,
															totalCount - 5
														)
													) // Last 5 (or fewer if total < 5)
												const commentKey =
													'thread-comments'
												const isExpanded =
													expandedCommentSections[
														commentKey
													]

												return (
													<>
														{/* Show Older/Fewer Button */}
														{olderComments.length >
															0 && (
															<ListItem
																sx={{
																	justifyContent:
																		'center',
																	pt: 0 // Remove padding top
																}}
															>
																<Button
																	variant="text"
																	color="primary"
																	size="small" // Smaller button
																	onClick={() =>
																		toggleExpandComments(
																			commentKey
																		)
																	}
																>
																	{isExpanded
																		? 'Show Fewer Comments'
																		: `Show ${olderComments.length} Older Comments`}
																</Button>
															</ListItem>
														)}

														{/* Render Older Comments if Expanded */}
														{isExpanded &&
															olderComments.map(
																(
																	comment,
																	index
																) => (
																	<ListItem
																		key={
																			comment.id ||
																			index // Key for older comments
																		}
																	>
																		<ListItemAvatar>
																			<Avatar
																				src={
																					comment
																						.author
																						?.avatar_url
																				}
																			>
																				{!comment
																					.author
																					?.avatar_url && (
																					<Comment />
																				)}
																			</Avatar>
																		</ListItemAvatar>
																		<ListItemText
																			primary={
																				<div
																					dangerouslySetInnerHTML={{
																						__html: DOMPurify.sanitize(
																							marked(
																								comment.body ||
																									''
																							)
																						)
																					}}
																				/>
																			}
																			secondary={`${comment.author?.name || 'Unknown'} - ${formatDate(new Date(comment.created_at))}`}
																		/>
																		{user?.id &&
																			comment
																				.author
																				?.id &&
																			user.id ===
																				comment
																					.author
																					.id && (
																				<ListItemSecondaryAction>
																					<IconButton
																						edge="end"
																						aria-label="delete"
																						onClick={() =>
																							handleDeleteComment(
																								comment
																							)
																						}
																						size="small"
																					>
																						<DeleteIcon fontSize="small" />
																					</IconButton>
																				</ListItemSecondaryAction>
																			)}
																	</ListItem>
																)
															)}

														{/* Always render newest five (or fewer) */}
														{newestFive.length > 0
															? newestFive.map(
																	(
																		comment,
																		index
																	) => (
																		<ListItem
																			key={
																				comment.id ||
																				index +
																					(olderComments.length >
																					0
																						? olderComments.length
																						: 0) // Adjust key index
																			}
																		>
																			<ListItemAvatar>
																				<Avatar
																					src={
																						comment
																							.author
																							?.avatar_url
																					}
																				>
																					{!comment
																						.author
																						?.avatar_url && (
																						<Comment />
																					)}
																				</Avatar>
																			</ListItemAvatar>
																			<ListItemText
																				primary={
																					<div
																						dangerouslySetInnerHTML={{
																							__html: DOMPurify.sanitize(
																								marked(
																									comment.body ||
																										''
																								)
																							)
																						}}
																					/>
																				}
																				secondary={`${comment.author?.name || 'Unknown'} - ${formatDate(new Date(comment.created_at))}`}
																			/>
																			{user?.id &&
																				comment
																					.author
																					?.id &&
																				user.id ===
																					comment
																						.author
																						.id && (
																					<ListItemSecondaryAction>
																						<IconButton
																							edge="end"
																							aria-label="delete"
																							onClick={() =>
																								handleDeleteComment(
																									comment
																								)
																							}
																							size="small"
																						>
																							<DeleteIcon fontSize="small" />
																						</IconButton>
																					</ListItemSecondaryAction>
																				)}
																		</ListItem>
																	)
																)
															: // Only show this if there are NO comments at all
																olderComments.length ===
																	0 && (
																	<ListItem>
																		<ListItemText primary="No thread comments yet." />
																	</ListItem>
																)}
													</>
												)
											})()}
										</List>

										{/* Add General Comment Section (Only for GitLab) */}
										{source === 'G' && (
											<Box
												sx={{
													mt: 3,
													p: 2,
													borderTop:
														'1px solid rgba(0, 0, 0, 0.12)'
												}}
												data-color-mode="light"
											>
												<Typography
													variant="h6"
													gutterBottom
												>
													Add Comment
												</Typography>
												<MDEditor
													value={generalCommentText}
													onChange={(val) =>
														setGeneralCommentText(
															val || ''
														)
													}
													preview="edit" // Or "live" or "preview"
													height={200}
												/>
												<Button
													variant="contained"
													color="primary"
													onClick={
														handleSaveGeneralComment
													} // Make sure this function is defined and working
													disabled={
														!generalCommentText.trim() ||
														isSubmittingComment
													}
													sx={{ mt: 2 }}
												>
													{isSubmittingComment
														? 'Submitting...'
														: 'Submit Comment'}
												</Button>
											</Box>
										)}
									</CardContent>
								)}

								{/* Inline Comments Panel */}
								{activeTab === 1 && (
									<CardContent>
										<List>
											{(() => {
												// Sort oldest first
												const sortedComments = [
													...currentInlineComments
												].sort(
													(a, b) =>
														new Date(a.created_at) - // Sort oldest first
														new Date(b.created_at)
												)
												const totalCount =
													sortedComments.length
												const olderComments =
													totalCount > 5
														? sortedComments.slice(
																0,
																totalCount - 5
															)
														: []
												const newestFive =
													sortedComments.slice(
														Math.max(
															0,
															totalCount - 5
														)
													)
												const commentKey =
													'inline-comments'
												const isExpanded =
													expandedCommentSections[
														commentKey
													]

												return (
													<>
														{/* Show Older/Fewer Button */}
														{olderComments.length >
															0 && (
															<ListItem
																sx={{
																	justifyContent:
																		'center',
																	pt: 0 // Remove padding top
																}}
															>
																<Button
																	variant="text"
																	color="primary"
																	size="small" // Smaller button
																	onClick={() =>
																		toggleExpandComments(
																			commentKey
																		)
																	}
																>
																	{isExpanded
																		? 'Show Fewer Comments'
																		: `Show ${olderComments.length} Older Comments`}
																</Button>
															</ListItem>
														)}

														{/* Render Older Comments if Expanded */}
														{isExpanded &&
															olderComments.map(
																(
																	comment,
																	index
																) => (
																	<ListItem
																		key={
																			comment.id ||
																			index
																		}
																		button
																		onClick={() =>
																			handleInlineCommentClick(
																				comment
																			)
																		}
																	>
																		<ListItemAvatar>
																			<Avatar
																				src={
																					comment
																						.author
																						?.avatar_url
																				}
																			>
																				{!comment
																					.author
																					?.avatar_url && (
																					<Comment color="primary" />
																				)}
																			</Avatar>
																		</ListItemAvatar>
																		<ListItemText
																			primary={
																				<div
																					dangerouslySetInnerHTML={{
																						__html: DOMPurify.sanitize(
																							marked(
																								comment.body ||
																									''
																							)
																						)
																					}}
																				/>
																			}
																			secondary={
																				<>
																					{`${comment.author?.name || 'Unknown'} - ${formatDate(new Date(comment.created_at))}`}
																					<br />
																					<Typography
																						variant="caption"
																						color="textSecondary"
																						sx={{
																							cursor: 'pointer'
																						}}
																					>
																						{`File: ${comment.position?.new_path}, Line: ${comment.position?.new_line}`}
																					</Typography>
																				</>
																			}
																		/>
																		{user?.id &&
																			comment
																				.author
																				?.id &&
																			user.id ===
																				comment
																					.author
																					.id && (
																				<ListItemSecondaryAction>
																					<IconButton
																						edge="end"
																						aria-label="delete"
																						onClick={(
																							e
																						) => {
																							e.stopPropagation()
																							handleDeleteComment(
																								comment
																							)
																						}}
																						size="small"
																					>
																						<DeleteIcon fontSize="small" />
																					</IconButton>
																				</ListItemSecondaryAction>
																			)}
																	</ListItem>
																)
															)}

														{/* Always Render Newest Five (or fewer) */}
														{newestFive.length > 0
															? newestFive.map(
																	(
																		comment,
																		index
																	) => (
																		<ListItem
																			key={
																				comment.id ||
																				index +
																					(olderComments.length >
																					0
																						? olderComments.length
																						: 0) // Adjust key index
																			}
																			button
																			onClick={() =>
																				handleInlineCommentClick(
																					comment
																				)
																			}
																		>
																			<ListItemAvatar>
																				<Avatar
																					src={
																						comment
																							.author
																							?.avatar_url
																					}
																				>
																					{!comment
																						.author
																						?.avatar_url && (
																						<Comment color="primary" />
																					)}
																				</Avatar>
																			</ListItemAvatar>
																			<ListItemText
																				primary={
																					<div
																						dangerouslySetInnerHTML={{
																							__html: DOMPurify.sanitize(
																								marked(
																									comment.body ||
																										''
																								)
																							)
																						}}
																					/>
																				}
																				secondary={
																					<>
																						{`${comment.author?.name || 'Unknown'} - ${formatDate(new Date(comment.created_at))}`}
																						<br />
																						<Typography
																							variant="caption"
																							color="textSecondary"
																							sx={{
																								cursor: 'pointer'
																							}}
																						>
																							{`File: ${comment.position?.new_path}, Line: ${comment.position?.new_line}`}
																						</Typography>
																					</>
																				}
																			/>
																			{user?.id &&
																				comment
																					.author
																					?.id &&
																				user.id ===
																					comment
																						.author
																						.id && (
																					<ListItemSecondaryAction>
																						<IconButton
																							edge="end"
																							aria-label="delete"
																							onClick={(
																								e
																							) => {
																								e.stopPropagation()
																								handleDeleteComment(
																									comment
																								)
																							}}
																							size="small"
																						>
																							<DeleteIcon fontSize="small" />
																						</IconButton>
																					</ListItemSecondaryAction>
																				)}
																		</ListItem>
																	)
																)
															: // Only show if no comments at all
																olderComments.length ===
																	0 && (
																	<ListItem>
																		<ListItemText primary="No inline comments yet." />
																	</ListItem>
																)}
													</>
												)
											})()}
										</List>
									</CardContent>
								)}
							</Card>
						</Grid>

						{/* Changed Files Card (now takes less width on medium screens) */}
						<Grid item xs={12} md={4}>
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										Changed Files ({diffs.length})
									</Typography>
									<List dense>
										{diffs.map((file, index) => {
											const filePath =
												file.newPath || file.oldPath
											const targetId = `diff-${filePath}` // Consistent ID for linking
											const handleFileClick = () => {
												// Ensure accordion for this file is expanded
												setExpandedAccordions(
													(prev) => ({
														...prev,
														[index]: true
													})
												)

												// Scroll to the accordion header after a short delay
												setTimeout(() => {
													const element =
														document.getElementById(
															targetId
														)
													if (element) {
														element.scrollIntoView({
															behavior: 'smooth',
															block: 'start'
														})
													}
												}, 50) // Small delay
											}

											return (
												<ListItem
													key={index}
													button
													onClick={handleFileClick}
													dense // Make list items smaller
												>
													<ListItemText
														primary={filePath}
														primaryTypographyProps={{
															style: {
																whiteSpace:
																	'nowrap',
																overflow:
																	'hidden',
																textOverflow:
																	'ellipsis',
																fontSize:
																	'0.875rem' // Smaller font for dense list
															}
														}}
													/>
												</ListItem>
											)
										})}
										{diffs.length === 0 && (
											<ListItem>
												<ListItemText primary="No files changed." />
											</ListItem>
										)}
									</List>
								</CardContent>
							</Card>
						</Grid>
					</Grid>
				</Grid>
			</Grid>

			{/* Changes Section (Full Width) */}
			<Grid item xs={12} sx={{ mt: 3 }}>
				{' '}
				{/* Add margin top */}
				<Card>
					<CardContent>
						<Box
							sx={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								mb: 2
							}}
						>
							<Typography variant="h6">Changes</Typography>
							<Box
								sx={{
									display: 'flex',
									alignItems: 'center',
									gap: 1
								}}
							>
								{/* Expand/Collapse Buttons */}
								<Button
									size="small"
									onClick={expandAllAccordions}
									disabled={diffs.length === 0}
								>
									Expand All
								</Button>
								<Button
									size="small"
									onClick={collapseAllAccordions}
									disabled={diffs.length === 0}
								>
									Collapse All
								</Button>
								{/* Diff View Switch */}
								<Typography variant="body2">
									Split View
								</Typography>
								<Switch
									checked={diffView === 'split'} // Control checked state
									color="secondary"
									onChange={handleDiffViewChange}
									size="small"
								/>
							</Box>
						</Box>

						{diffs.length > 0 ? (
							diffs.map((file, index) => {
								const processedDiff = preprocessDiff(
									file.diff,
									file.oldPath,
									file.newPath
								)

								let parsedDiffFiles = [] // Rename to avoid conflict
								try {
									// Ensure parseDiff returns an array
									const result = parseDiff(processedDiff)
									parsedDiffFiles = Array.isArray(result)
										? result
										: []
								} catch (error) {
									console.error(
										'Error parsing diff for file:',
										file.newPath || file.oldPath,
										error,
										processedDiff // Log the problematic diff
									)
									// Optionally render an error message for this file's diff
									return (
										<Accordion
											key={index}
											disabled
											sx={{ mb: 2 }}
										>
											<AccordionSummary>
												<Typography color="error">
													Error parsing diff for:{' '}
													{file.newPath ||
														file.oldPath}
												</Typography>
											</AccordionSummary>
										</Accordion>
									)
								}

								// Check if parsedDiffFiles has elements and hunks exist
								const hunks = parsedDiffFiles?.[0]?.hunks || []
								const filePath = file.newPath || file.oldPath // For unique key/ID

								return (
									<Accordion
										key={`${filePath}-${index}`} // More robust key
										sx={{ mb: 2 }} // Margin bottom for spacing
										expanded={
											expandedAccordions[index] || false
										}
										onChange={handleAccordionChange(index)}
										TransitionProps={{
											unmountOnExit: true
										}} // Improve performance by unmounting collapsed diffs
									>
										<AccordionSummary
											expandIcon={<ExpandMore />}
											id={`diff-${filePath}`} // ID for scrolling
											aria-controls={`diff-content-${index}`}
										>
											{/* File Status Chips */}
											{file.isNewFile && (
												<Chip
													label="New"
													color="success"
													size="small"
													sx={{ mr: 1 }}
												/>
											)}
											{file.isDeletedFile && (
												<Chip
													label="Deleted"
													color="error"
													size="small"
													sx={{ mr: 1 }}
												/>
											)}
											{file.isRenamedFile && (
												<Chip
													label="Renamed"
													color="primary"
													size="small"
													sx={{ mr: 1 }}
												/>
											)}
											{/* File Path Typography */}
											<Typography
												sx={{ wordBreak: 'break-all' }}
											>
												{' '}
												{/* Allow long paths to wrap */}
												{file.isRenamedFile ? (
													<>
														<span
															style={{
																textDecoration:
																	'line-through'
															}}
														>
															{file.oldPath}
														</span>{' '}
														→ <b>{file.newPath}</b>
													</>
												) : (
													<b>{filePath}</b>
												)}
											</Typography>
										</AccordionSummary>
										<AccordionDetails
											sx={{
												p: 0,
												'& .diff': {
													fontSize: '0.875em'
												}
											}}
										>
											{' '}
											{/* Remove padding and style diff */}
											{hunks.length > 0 ? (
												<Diff
													viewType={diffView}
													diffType={
														file.isNewFile
															? 'add'
															: file.isDeletedFile
																? 'delete'
																: 'modify'
													} // Use appropriate diffType
													hunks={hunks}
													renderGutter={(
														gutterProps // Pass props explicitly
													) =>
														renderGutter(
															gutterProps,
															file.newPath // Pass newPath for comment context
														)
													}
												>
													{(hunks) =>
														hunks.map((hunk) => (
															<Hunk
																key={
																	hunk.content
																}
																hunk={hunk}
															/>
														))
													}
												</Diff>
											) : (
												<Typography sx={{ p: 2 }}>
													{' '}
													{/* Add padding if no hunks */}
													No code changes available
													for this file.
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

			{/* Modal for Adding Inline Comments */}
			<Modal
				open={isAddingComment}
				onClose={() => setIsAddingComment(false)}
				aria-labelledby="add-inline-comment-title"
			>
				<Box
					sx={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						width: '90%',
						maxWidth: 600, // Limit max width
						bgcolor: 'background.paper',
						boxShadow: 24,
						p: 4, // Padding
						borderRadius: 1 // Rounded corners
					}}
				>
					<Typography
						id="add-inline-comment-title"
						variant="h6"
						component="h2"
						gutterBottom
					>
						Add Inline Comment
					</Typography>
					<Typography
						variant="body2"
						color="textSecondary"
						gutterBottom
					>
						{`File: ${newComment.fileId}, Line: ${newComment.lineNumber}`}
					</Typography>
					<Box sx={{ mb: 2 }} data-color-mode="light">
						<MDEditor
							value={newComment.text}
							onChange={(val) =>
								setNewComment({
									...newComment,
									text: val || ''
								})
							}
							preview="edit"
							height={250}
							autoFocus
						/>
					</Box>
					<Box
						sx={{
							mt: 2,
							display: 'flex',
							justifyContent: 'flex-end',
							gap: 1 // Add gap between buttons
						}}
					>
						<Button
							onClick={() => setIsAddingComment(false)}
							variant="outlined" // Use outlined style for cancel
						>
							Cancel
						</Button>
						<Button
							onClick={saveNewComment}
							variant="contained"
							color="primary"
							disabled={
								!newComment.text.trim() ||
								isSubmittingInlineComment
							}
						>
							{isSubmittingInlineComment
								? 'Saving...'
								: 'Save Comment'}
						</Button>
					</Box>
				</Box>
			</Modal>

			{/* Scroll-to-top Button */}
			{showScrollTopButton && (
				<Fab
					color="primary"
					size="small"
					aria-label="scroll back to top"
					onClick={scrollToTop}
					sx={{
						position: 'fixed',
						bottom: 16,
						right: 16
					}}
				>
					<KeyboardArrowUp />
				</Fab>
			)}

			{/* Popover for displaying inline comments */}
			<Popover
				open={Boolean(popoverAnchorEl)}
				anchorEl={popoverAnchorEl}
				onClose={handleCloseCommentPopover}
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'right'
				}}
				transformOrigin={{
					vertical: 'top',
					horizontal: 'left'
				}}
				PaperProps={{
					sx: {
						p: 1,
						minWidth: COMMENT_MIN_WIDTH,
						maxWidth: COMMENT_MAX_WIDTH,
						maxHeight: '350px', // Max height for the popover content
						display: 'flex',
						flexDirection: 'column'
					}
				}}
			>
				{/* Scrollable container for comments inside Popover */}
				<Box sx={{ flex: 1, overflowY: 'auto', mb: 1 }}>
					{/* Button to show older comments */}
					{(() => {
						const comments = activeCommentData.comments || [] // Already sorted oldest first
						const totalCount = comments.length
						const olderComments =
							totalCount > 5
								? comments.slice(0, totalCount - 5)
								: []
						const commentKey = `popover-${activeCommentData.fileId}-${activeCommentData.line?.change?.lineNumber}`
						const isExpanded = expandedCommentSections[commentKey]

						return (
							olderComments.length > 0 && (
								<Button
									variant="text"
									color="primary"
									size="small"
									onClick={() =>
										toggleExpandComments(commentKey)
									}
									sx={{
										my: 0.5, // Reduce vertical margin
										display: 'block',
										mx: 'auto',
										textAlign: 'center' // Center text
									}}
								>
									{isExpanded
										? 'Show Fewer Comments'
										: `Show ${olderComments.length} Older Comments`}
								</Button>
							)
						)
					})()}

					{/* Display older comments if expanded */}
					{(() => {
						const comments = activeCommentData.comments || [] // Already sorted oldest first
						const totalCount = comments.length
						const olderComments =
							totalCount > 5
								? comments.slice(0, totalCount - 5)
								: []
						const commentKey = `popover-${activeCommentData.fileId}-${activeCommentData.line?.change?.lineNumber}`
						const isExpanded = expandedCommentSections[commentKey]

						return (
							isExpanded &&
							olderComments.map((comment, index) => (
								<Box
									key={comment.id || index} // Use comment.id if available
									sx={{
										p: 1,
										backgroundColor: '#f9f9f9',
										borderLeft: '3px solid #1976d2',
										my: 1,
										position: 'relative'
									}}
								>
									{/* ... Comment content ... */}
									<Typography
										variant="caption"
										sx={{
											fontWeight: 'bold',
											display: 'block'
										}}
									>
										{comment.author?.name || 'Unknown User'}{' '}
										commented:
									</Typography>
									<Typography
										variant="body2"
										sx={{
											overflowWrap: 'break-word',
											whiteSpace: 'pre-wrap'
										}}
									>
										{comment.body}
									</Typography>
									<Typography
										variant="caption"
										color="textSecondary"
									>
										{formatDate(comment.created_at)}
									</Typography>
									{/* Delete Button */}
									{user?.id &&
										comment.author?.id &&
										user.id === comment.author.id && (
											<IconButton
												aria-label="delete"
												onClick={() =>
													handleDeleteComment(comment)
												}
												size="small"
												sx={{
													position: 'absolute',
													top: 4,
													right: 4
												}}
											>
												<DeleteIcon fontSize="inherit" />
											</IconButton>
										)}
								</Box>
							))
						)
					})()}

					{/* Always display up to 5 newest comments */}
					{(() => {
						const comments = activeCommentData.comments || [] // Already sorted oldest first
						const totalCount = comments.length
						const newestFive = comments.slice(
							Math.max(0, totalCount - 5)
						)

						return newestFive.map((comment, index) => (
							<Box
								key={
									comment.id ||
									index +
										(totalCount > 5 ? totalCount - 5 : 0)
								} // Adjust key
								sx={{
									p: 1,
									backgroundColor: '#f9f9f9',
									borderLeft: '3px solid #1976d2',
									my: 1,
									position: 'relative'
								}}
							>
								{/* Replicate comment content structure */}
								<Typography
									variant="caption"
									sx={{
										fontWeight: 'bold',
										display: 'block'
									}}
								>
									{comment.author?.name || 'Unknown User'}{' '}
									commented:
								</Typography>
								<Typography
									variant="body2"
									sx={{
										overflowWrap: 'break-word',
										whiteSpace: 'pre-wrap'
									}}
								>
									{comment.body}
								</Typography>
								<Typography
									variant="caption"
									color="textSecondary"
								>
									{formatDate(comment.created_at)}
								</Typography>
								{/* Delete Button INSIDE the comment Box */}
								{user?.id &&
									comment.author?.id &&
									user.id === comment.author.id && (
										<IconButton
											aria-label="delete"
											onClick={() =>
												handleDeleteComment(comment)
											}
											size="small"
											sx={{
												position: 'absolute',
												top: 4,
												right: 4
											}} // Position top-right within comment box
										>
											<DeleteIcon fontSize="inherit" />
										</IconButton>
									)}
							</Box>
						))
					})()}
				</Box>

				{/* Button to add another comment (only for GitLab) - Placed outside scrollable area */}
				{source === 'G' && (
					<Button
						variant="text"
						color="primary"
						size="small"
						onClick={() => {
							// Use data stored in activeCommentData
							handleAddComment(
								activeCommentData.line,
								activeCommentData.fileId
							)
							handleCloseCommentPopover() // Close popover when opening add modal
						}}
						sx={{ mt: 'auto', flexShrink: 0 }}
					>
						Add Comment
					</Button>
				)}
			</Popover>
		</Box>
	)
}

export default RevisionDetail
