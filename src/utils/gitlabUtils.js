import dayjs from 'dayjs'
import dotenv from 'dotenv'
dotenv.config()

// Helper function to map access level to role name
function getRoleName(accessLevel) {
	switch (accessLevel) {
		case 30:
			return 'developer'
		case 40:
			return 'maintainer'
		case 50:
			return 'owner'
		default:
			return null
	}
}

const safeJSONParse = (key, defaultValue = null) => {
	try {
		const item = localStorage.getItem(key)
		return item ? JSON.parse(item) : defaultValue
	} catch (error) {
		console.error(`Error parsing ${key} from localStorage:`, error)
		return defaultValue
	}
}

const getGitlabToken = () => {
	const token = safeJSONParse('gitlabToken')
	if (!token || !token.token) {
		throw new Error('GitLab token not found or invalid')
	}
	return token.token
}

const isGitlabTokenValid = () => {
	const storedToken = localStorage.getItem('gitlabToken')
	const gitlabUrl = localStorage.getItem('gitlabUrl')

	if (!storedToken || !gitlabUrl) {
		return false
	}

	try {
		const gitlabToken = JSON.parse(storedToken)

		// Add checks for token structure and expires field
		if (
			!gitlabToken ||
			typeof gitlabToken !== 'object' ||
			!gitlabToken.expires
		) {
			console.error(
				'Invalid GitLab token structure or missing expires field.'
			)
			return false
		}

		const today = dayjs()
		const expires = dayjs(gitlabToken.expires)

		// Add check for valid date parsing
		if (!expires.isValid()) {
			console.error('Invalid expires date format in GitLab token.')
			return false
		}

		return expires.isAfter(today)
	} catch (error) {
		// Catch JSON parsing errors specifically
		console.error('Error parsing GitLab token from localStorage:', error)
		return false
	}
}

const gitlabConnect = (gitlabUrl, gitlabAppId, gitlabRedirectUri) => {
	console.log(
		'Gitlab URL:',
		gitlabUrl,
		'App ID:',
		gitlabAppId,
		'Redirect URI:',
		gitlabRedirectUri
	)
	const gitlabAuthUrl = `${gitlabUrl}/oauth/authorize?client_id=${gitlabAppId}&redirect_uri=${gitlabRedirectUri}&response_type=code&scope=api`

	window.location.href = gitlabAuthUrl
}

const gitlabCallback = async (code) => {
	const response = await fetch(
		`${localStorage.getItem('gitlabUrl')}/oauth/token`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: localStorage.getItem('gitlabAppId'),
				client_secret: localStorage.getItem('gitlabSecret'),
				code: code,
				grant_type: 'authorization_code',
				redirect_uri: localStorage.getItem('gitlabRedirectUri')
			})
		}
	)
	const data = await response.json()
	if (data.access_token) {
		const token = {
			token: data.access_token,
			expires: dayjs().add(data.expires_in, 'seconds')
		}
		localStorage.setItem('gitlabToken', JSON.stringify(token))
		return data.access_token
	} else {
		throw new Error('Failed to obtain access token')
	}
}

const getMyGitlabUser = async () => {
	const gitlabToken = getGitlabToken()
	const gitlabUrl = localStorage.getItem('gitlabUrl')
	if (!gitlabToken || !gitlabUrl) {
		return console.error('No Gitlab token or URL')
	}
	try {
		const response = await fetch(`${gitlabUrl}/api/v4/user`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${gitlabToken}`
			}
		})

		if (!response.ok) {
			throw new Error(`Error fetching user: ${response.statusText}`)
		}

		const user = await response.json()
		console.log('Gitlab User:', user)
		localStorage.setItem('gitlabUser', JSON.stringify(user))
		return user
	} catch (error) {
		console.error('Error fetching user:', error)
		return {}
	}
}

const getGitlabProjects = async () => {
	const gitlabToken = getGitlabToken()
	const gitlabUser = safeJSONParse('gitlabUser')
	const gitlabUrl = localStorage.getItem('gitlabUrl')
	const roles = ['developer', 'owner', 'maintainer']
	let allProjects = []
	let page = 1

	try {
		if (!gitlabUser) return null

		// eslint-disable-next-line no-constant-condition
		while (true) {
			const response = await fetch(
				`${gitlabUrl}/api/v4/projects?membership=true&per_page=100&page=${page}`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${gitlabToken}`
					}
				}
			)

			if (!response.ok) {
				throw new Error(
					`Error fetching projects: ${response.statusText}`
				)
			}

			const projects = await response.json()

			if (projects.length === 0) {
				break
			}

			// Filter projects based on the user's role
			const userProjects = projects.filter((project) => {
				const userRole =
					project.permissions?.project_access?.access_level
				return roles.includes(getRoleName(userRole))
			})

			allProjects = allProjects.concat(userProjects)
			page++
		}

		console.log('Gitlab Projects:', allProjects)
		return allProjects
	} catch (error) {
		console.error('Error fetching projects:', error)
		return []
	}
}

const getProjectsByIds = async (ids) => {
	const gitlabToken = getGitlabToken()
	const gitlabUrl = localStorage.getItem('gitlabUrl')
	const newIds = ids
		.split(',')
		.map((id) => id.trim())
		.filter((id) => id)

	try {
		const fetchedProjects = await Promise.all(
			newIds.map(async (id) => {
				const response = await fetch(
					`${gitlabUrl}/api/v4/projects/${id}`,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${gitlabToken}`
						}
					}
				)

				if (!response.ok) {
					throw new Error(
						`Error fetching project with ID ${id}: ${response.statusText}`
					)
				}

				return await response.json()
			})
		)

		return fetchedProjects
	} catch (error) {
		console.error('Error fetching projects:', error)
		// Re-throw the error so the promise rejects
		throw error 
	}
}

const getStarredGitlabProjects = async () => {
	const gitlabToken = getGitlabToken()
	const gitlabUrl = localStorage.getItem('gitlabUrl')

	try {
		const response = await fetch(
			`${gitlabUrl}/api/v4/projects?starred=true&per_page=100`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(
				`Error fetching starred projects: ${response.statusText}`
			)
		}

		const projects = await response.json()
		console.log('Starred Projects:', projects)
		return projects
	} catch (error) {
		console.error('Error fetching starred projects:', error)
		return []
	}
}

async function getUnmergedGitlabMergeRequests(projectId) {
	const gitlabToken = getGitlabToken()
	try {
		const response = await fetch(
			`${localStorage.getItem('gitlabUrl')}/api/v4/projects/${projectId}/merge_requests?state=opened`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(
				`Error fetching merge requests: ${response.statusText}`
			)
		}

		const mergeRequests = await response.json()
		return mergeRequests
	} catch (error) {
		console.error('Error fetching unmerged merge requests:', error)
		return []
	}
}

async function getGitlabMRsFromAllProjects() {
	const projects = safeJSONParse('gitProjects', [])
	if (!projects || projects.length === 0) return []

	const mergeRequests = await Promise.all(
		projects.map(async (project) => {
			const mrs = await getUnmergedGitlabMergeRequests(project.id)
			// Add project namespace to each merge request
			return mrs.map((mr) => ({
				...mr,
				project_namespace: project.path_with_namespace || 'Unknown',
				project_url: project.web_url,
				name: project.name
			}))
		})
	)
	console.log('Gitlab Merge Requests:', mergeRequests.flat())
	return mergeRequests.flat()
}

async function getGitlabMRbyId(mergeRequestId, projectId) {
	const gitlabToken = getGitlabToken()
	try {
		const response = await fetch(
			`${localStorage.getItem('gitlabUrl')}/api/v4/projects/${projectId}/merge_requests/${mergeRequestId}`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(
				`Error fetching merge request: ${response.statusText}`
			)
		}

		const mergeRequest = await response.json()
		return mergeRequest
	} catch (error) {
		console.error('Error fetching merge request:', error)
		return {}
	}
}

async function getMRComments(projectId, mergeRequestId) {
	const gitlabToken = getGitlabToken()
	try {
		const response = await fetch(
			`${localStorage.getItem('gitlabUrl')}/api/v4/projects/${projectId}/merge_requests/${mergeRequestId}/notes`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(
				`Error fetching merge request comments: ${response.statusText}`
			)
		}

		const comments = await response.json()
		return comments
	} catch (error) {
		console.error('Error fetching merge request comments:', error)
		return []
	}
}

async function getMRCommits(projectId, mergeRequestId) {
	const gitlabToken = getGitlabToken()
	try {
		const response = await fetch(
			`${localStorage.getItem('gitlabUrl')}/api/v4/projects/${projectId}/merge_requests/${mergeRequestId}/commits`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(
				`Error fetching merge request commits: ${response.statusText}`
			)
		}

		const commits = await response.json()
		// Transform commits slightly for consistency
		return commits.map((commit) => ({
			id: commit.id,
			message: commit.message,
			author: {
				name: commit.author_name,
				email: commit.author_email,
				epoch: new Date(commit.authored_date).getTime() / 1000 // Convert to epoch seconds
			}
		}))
	} catch (error) {
		console.error('Error fetching merge request commits:', error)
		return []
	}
}

async function getTransformedGitlabMRs() {
	const mergeRequests = await getGitlabMRsFromAllProjects()
	const followedUsers = safeJSONParse('followedUsers', [])

	const transformedMRs = mergeRequests.map((mr) => ({
		id: mr.iid,
		title: mr.title,
		status: mr.detailed_merge_status,
		url: mr.web_url,
		author: mr.author?.name || 'Unknown',
		dateModified: mr.updated_at,
		isDraft: mr.work_in_progress,
		project: mr.name,
		projectUrl: mr.project_url,
		projectId: mr.project_id,
		iid: mr.iid || '',
		color:
			mr.detailed_merge_status === 'mergeable' ||
			mr.detailed_merge_status === 'discussions_not_resolved'
				? 'git-green'
				: 'orange',
		jiraId: mr.title.match(/\[(\w+-\d+)\]/)?.[1],
		following: followedUsers.some((user) => user.id === mr.author?.id),
		rowClick: async () => {
			const mrdet = await getGitlabMRbyId(mr.iid, mr.project_id)
			console.log('Merge Request:', mrdet)
		},
		source: 'G'
	}))

	console.log('Transformed Merge Requests:', transformedMRs)
	return transformedMRs
}

const getFollowedUsers = async () => {
	const gitlabToken = getGitlabToken()
	const gitlabUrl = localStorage.getItem('gitlabUrl')
	const userId = safeJSONParse('gitlabUser')?.id

	try {
		const response = await fetch(
			`${gitlabUrl}/api/v4/users/${userId}/following`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(`Error fetching users: ${response.statusText}`)
		}

		const users = await response.json()
		localStorage.setItem('followedUsers', JSON.stringify(users))
		console.log('Followed Users:', users)
		return users
	} catch (error) {
		console.error('Error fetching followed users:', error)
		return []
	}
}

async function getTransformedMRInfo(revision) {
	console.log(
		'[getTransformedMRInfo] Starting transformation for revision:',
		revision?.iid,
		revision
	)
	try {
		const projects = safeJSONParse('gitProjects', [])
		console.log(
			`[getTransformedMRInfo] Found ${projects?.length} projects in storage.`
		)
		const project = projects?.find((p) => p.id === revision.project_id)
		console.log(
			`[getTransformedMRInfo] Found project in storage:`,
			project ? project.id : 'Not Found'
		)
		if (!project) {
			console.error(
				`[getTransformedMRInfo] Critical Error: Project with ID ${revision.project_id} not found in local storage ('gitProjects'). Cannot proceed.`
			)
			return null // Stop transformation if project is missing
		}

		console.log(
			`[getTransformedMRInfo] Fetching comments for MR ${revision.iid}...`
		)
		let comments
		try {
			comments = await getMRComments(revision.project_id, revision.iid)
			console.log(
				`[getTransformedMRInfo] Fetched ${comments?.length} comments.`
			)
			comments?.sort(
				(a, b) => new Date(a.created_at) - new Date(b.created_at)
			)
		} catch (error) {
			console.error(
				`[getTransformedMRInfo] Error during transformation for MR ${revision?.iid}:`,
				error
			)
			return null
		}

		console.log(
			`[getTransformedMRInfo] Fetching commits for MR ${revision.iid}...`
		)
		let commits
		try {
			commits = await getMRCommits(revision.project_id, revision.iid)
			console.log(
				`[getTransformedMRInfo] Fetched ${commits?.length} commits.`
			)
		} catch (error) {
			console.error(
				`[getTransformedMRInfo] Error during transformation for MR ${revision?.iid}:`,
				error
			)
			return null
		}

		console.log(`[getTransformedMRInfo] Filtering inline comments...`)
		const inlineComments =
			comments?.filter((comment) => comment?.type === 'DiffNote') || []
		console.log(
			`[getTransformedMRInfo] Found ${inlineComments?.length} inline comments.`
		)

		console.log(`[getTransformedMRInfo] Extracting Jira ID...`)
		const jiraId = revision.title?.match(/\[(\w+-\d+)\]/)?.[1] // Optional chaining
		console.log(`[getTransformedMRInfo] Jira ID found: ${jiraId || 'None'}`)

		console.log(`[getTransformedMRInfo] Constructing final object...`)
		// Use optional chaining heavily to avoid crashes on null/undefined properties
		const transformed = {
			id: revision.iid,
			title: revision.title,
			summary: revision.description,
			status: revision.detailed_merge_status,
			url: revision.web_url,
			author: {
				name: revision.author?.name,
				username: revision.author?.username
			},
			dateModified: revision.updated_at,
			project: project?.name,
			projectUrl: project?.web_url,
			projectId: project?.id,
			jiraId: jiraId || '',
			branch: revision.source_branch,
			reviewers: revision.reviewers || [],
			comments: comments || [],
			// Check pipeline existence before accessing status
			pipeline: revision.pipeline?.status,
			inlineComments: inlineComments || [],
			commits: commits || [],
			diff_refs: revision.diff_refs
		}
		console.log(
			`[getTransformedMRInfo] Transformation successful for MR ${revision.iid}.`
		)
		return transformed
	} catch (error) {
		console.error(
			`[getTransformedMRInfo] Error during transformation for MR ${revision?.iid}:`,
			error
		)
		return null // Return null on error to indicate failure
	}
}

async function getMRDiff(projectId, mergeRequestIid) {
	const gitlabToken = JSON.parse(localStorage.getItem('gitlabToken')).token
	const gitlabUrl = localStorage.getItem('gitlabUrl')

	try {
		// Fetch the diff for the merge request
		const response = await fetch(
			`${gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${mergeRequestIid}/changes`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				}
			}
		)

		if (!response.ok) {
			throw new Error(
				`Error fetching merge request diff: ${response.statusText}`
			)
		}

		// Parse the response JSON
		const data = await response.json()

		// Extract the changes (diffs) for each file
		const changes = data.changes || []
		console.log('Changes:', changes)
		const parsedDiffs = changes.map((file) => ({
			oldPath: file.old_path,
			newPath: file.new_path,
			diff: file.diff,
			isNewFile: file.new_file,
			isRenamedFile: file.renamed_file,
			isDeletedFile: file.deleted_file
		}))

		console.log('Parsed Diffs:', parsedDiffs)
		return parsedDiffs
	} catch (error) {
		console.error('Error fetching merge request diff:', error)
		return []
	}
}

async function addGitlabComment(projectId, mergeRequestIid, body) {
	const gitlabToken = getGitlabToken()
	const gitlabUrl = localStorage.getItem('gitlabUrl')

	if (!gitlabToken || !gitlabUrl || !projectId || !mergeRequestIid || !body) {
		console.error('Missing required parameters for adding comment')
		throw new Error('Missing required parameters for adding comment')
	}

	try {
		const response = await fetch(
			`${gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${mergeRequestIid}/notes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				},
				body: JSON.stringify({ body })
			}
		)

		if (!response.ok) {
			const errorData = await response.json()
			console.error('Error adding comment:', errorData)
			throw new Error(
				`Error adding comment: ${response.statusText} - ${errorData.message || ''}`
			)
		}

		const newComment = await response.json()
		console.log('Comment added successfully:', newComment)
		return newComment
	} catch (error) {
		console.error('Error adding comment:', error)
		throw error // Re-throw the error for the caller to handle
	}
}

async function addGitlabInlineComment(
	projectId,
	mergeRequestIid,
	body,
	position
) {
	const gitlabToken = getGitlabToken()
	const gitlabUrl = localStorage.getItem('gitlabUrl')

	if (
		!gitlabToken ||
		!gitlabUrl ||
		!projectId ||
		!mergeRequestIid ||
		!body ||
		!position
	) {
		console.error('Missing required parameters for adding inline comment')
		throw new Error('Missing required parameters for adding inline comment')
	}

	// Ensure position has required fields for GitLab API
	if (
		!position.base_sha ||
		!position.start_sha ||
		!position.head_sha ||
		!position.new_path ||
		!position.position_type
	) {
		console.error(
			'Missing required fields in position object for inline comment:',
			position
		)
		throw new Error(
			'Missing required fields in position object for inline comment'
		)
	}
	// Must have either old_line or new_line
	if (position.old_line == null && position.new_line == null) {
		console.error(
			'Position object must contain either old_line or new_line:',
			position
		)
		throw new Error(
			'Position object must contain either old_line or new_line'
		)
	}

	try {
		const response = await fetch(
			`${gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${mergeRequestIid}/discussions`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${gitlabToken}`
				},
				body: JSON.stringify({
					body: body,
					position: position
				})
			}
		)

		if (!response.ok) {
			const errorData = await response.json()
			console.error('Error adding inline comment:', errorData)
			throw new Error(
				`Error adding inline comment: ${response.statusText} - ${JSON.stringify(errorData.message || '')}`
			)
		}

		const newDiscussion = await response.json()
		// The API returns the discussion, the first note is our comment
		const newComment = newDiscussion?.notes?.[0]
		console.log('Inline comment added successfully:', newComment)
		return newComment // Return the actual comment object
	} catch (error) {
		console.error('Error in addGitlabInlineComment:', error)
		throw error
	}
}

async function deleteGitlabComment(projectId, mergeRequestIid, noteId) {
	const gitlabToken = getGitlabToken()
	const gitlabUrl = localStorage.getItem('gitlabUrl')

	if (
		!gitlabToken ||
		!gitlabUrl ||
		!projectId ||
		!mergeRequestIid ||
		!noteId
	) {
		console.error('Missing required parameters for deleting comment')
		throw new Error('Missing required parameters for deleting comment')
	}

	try {
		const response = await fetch(
			`${gitlabUrl}/api/v4/projects/${projectId}/merge_requests/${mergeRequestIid}/notes/${noteId}`,
			{
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${gitlabToken}`
				}
			}
		)

		// GitLab DELETE returns 204 No Content on success
		if (response.status === 204) {
			console.log(`Comment with noteId ${noteId} deleted successfully.`)
			return true // Indicate success
		} else if (!response.ok) {
			// Try to parse error if possible
			let errorData = {}
			try {
				errorData = await response.json()
			} catch (e) {
				/* Ignore parsing error */
			}
			console.error(
				`Error deleting comment ${noteId}:`,
				response.status,
				response.statusText,
				errorData
			)
			throw new Error(
				`Error deleting comment: ${response.statusText} - ${JSON.stringify(errorData.message || '')}`
			)
		} else {
			// Handle unexpected successful status codes if needed
			console.warn(
				`Unexpected status code ${response.status} when deleting comment ${noteId}.`
			)
			return true // Assume success on other 2xx codes potentially? Or throw error?
		}
	} catch (error) {
		console.error(
			`Error in deleteGitlabComment for noteId ${noteId}:`,
			error
		)
		throw error
	}
}

export {
	getRoleName,
	isGitlabTokenValid,
	gitlabConnect,
	gitlabCallback,
	getMyGitlabUser,
	getGitlabProjects,
	getProjectsByIds,
	getStarredGitlabProjects,
	getUnmergedGitlabMergeRequests,
	getGitlabMRbyId,
	getTransformedGitlabMRs,
	getGitlabMRsFromAllProjects,
	getFollowedUsers,
	getTransformedMRInfo,
	getMRDiff,
	getMRComments,
	getMRCommits,
	addGitlabComment,
	addGitlabInlineComment,
	deleteGitlabComment,
	safeJSONParse
}
