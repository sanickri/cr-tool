import qs from 'qs'
import dotenv from 'dotenv'
dotenv.config()

class PhabricatorAPI {
	/**
	 * @param {Object} config - Configuration object
	 */
	constructor(config) {
		this.config = config
	}

	async callAPI(method, query) {
		const response = await fetch(
			`${this.config.phabricatorUrl}/api/${method}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: qs.stringify({
					...query,
					'api.token': this.config.phabricatorToken
				})
			}
		)

		const data = await response.json()

		if (data.error_code) {
			throw new Error(
				`Phabricator Error ${data.error_code}: ${data.error_info}`
			)
		}

		return data.result
	}

	// To find PHID: curl -X POST -d api.token=your_api_token https://<your_phabricator_instance>/api/user.whoami
	async getUserInfo(userPHID) {
		const result = await this.callAPI('user.search', {
			constraints: {
				phids: [userPHID]
			}
		})
		return result.data
	}

	async getRevisions() {
		const result = await this.callAPI('differential.revision.search', {
			constraints: {
				statuses: ['needs-review', 'needs-revision', 'accepted']
			}
		})
		return result.data
	}

	async getRevisionInfo(revisionId) {
		const result = await this.callAPI('differential.revision.search', {
			constraints: {
				ids: [revisionId]
			}
		})
		return result.data
	}

	async getDiffInfo(diffId) {
		const result = await this.callAPI('differential.diff.search', {
			constraints: {
				phids: [diffId]
			},
			attachments: {
				reviewers: true
			}
		})
		return result.data
	}

	async getPhabricatorRepositoryInfo(phid) {
		const result = await this.callAPI('diffusion.repository.search', {
			constraints: {
				phids: [phid]
			}
		})
		return result.data
	}

	async getTransformedRevisions() {
		const revisions = await this.getRevisions()
		const transformedRevisions = await Promise.all(
			revisions.map(async (revision) => {
				const author = await this.getUserInfo(
					revision.fields.authorPHID
				)
				const project = await this.getPhabricatorRepositoryInfo(
					revision.repositoryPHID
				)
				// retrieve Jira id from revision title eg. [JIRA-123] Title and not [nojira]
				const jiraId = revision.fields.title.match(/\[(\w+-\d+)\]/)
				return {
					id: revision.id,
					title: revision.fields.title,
					status: revision.fields.status.value,
					url: `${this.config.phabricatorUrl}/D${revision.id}`,
					author: author[0].fields.realName,
					dateModified: revision.fields.dateModified * 1000,
					isDraft: revision.fields.isDraft,
					project: project[0].fields.name,
					projectUrl: `${this.config.phabricatorUrl}/diffusion/${project[0].id}`,
					projectId: project[0].id,
					jiraId: jiraId ? jiraId[1] : '',
					color:
						revision.fields.status.value === 'accepted'
							? 'phab-green'
							: 'blue',
					source: 'P'
				}
			})
		)
		return transformedRevisions
	}

	async getDiffChanges(diffID) {
		const result = await this.callAPI('differential.diff.search', {
			constraints: {
				revisionPHIDs: [diffID]
			},
			attachments: {
				commits: true
			}
		})
		return result.data
	}

	async getRawDiff(diffId) {
		const result = await this.callAPI('differential.getrawdiff', {
			diffID: diffId
		})
		return result
	}

	async getRevisionComments(revisionId, revisionPHID) {
		const inlineDetails = await this.callAPI('transaction.search', {
			objectIdentifier: revisionPHID
		})
		console.log('Inline Details:', inlineDetails)
		return inlineDetails
	}

	async processComments(inlineDetails) {
		if (!inlineDetails) {
			return []
		}
		console.log('Inline Details:', inlineDetails)
		const data = inlineDetails.data
		const comments = data.filter(
			(comment) =>
				comment.type === 'comment' &&
				comment.comments &&
				comment.comments.length > 0
		)
		await Promise.all(
			comments.map(async (comment) => {
				const author = await this.getUserInfo(comment.authorPHID)
				comment.body = comment.comments[0].content.raw
				comment.id = comment.comments[0].id
				comment.author = {
					id: comment.authorPHID,
					name: author[0].fields.realName,
					username: author[0].fields.username
				}
				comment.created_at = comment.dateCreated * 1000
			})
		)
		comments.sort((a, b) => a.dateCreated - b.dateCreated)

		const inlineComments = data.filter(
			(comment) =>
				comment.type === 'inline' &&
				comment.comments &&
				comment.comments.length > 0
		)
		console.log('Inline Comments:', inlineComments)
		await Promise.all(
			inlineComments.map(async (comment) => {
				const author = await this.getUserInfo(comment.authorPHID)
				console.log('Author:', author)
				comment.body = comment.comments[0].content.raw
				comment.id = comment.comments[0].id
				comment.author = {
					id: comment.authorPHID,
					name: author[0].fields.realName,
					username: author[0].fields.username
				}
				comment.position = {
					new_line: comment.fields.line,
					new_path: comment.fields.path
				}
				comment.created_at = comment.dateCreated * 1000
			})
		)
		inlineComments.sort((a, b) => a.dateCreated - b.dateCreated)
		comments.push(...inlineComments)
		return { comments, inlineComments }
	}

	async getRevisionCommits(revisionId) {
		const result = await this.callAPI('diffusion.commit.search', {
			constraints: {
				phids: [revisionId]
			}
		})
		return result.data
	}

	async getRevisionDetailsWithReviewers(revisionId) {
		const result = await this.callAPI('differential.query', {
			ids: [revisionId]
		})
		return result
	}

	parseMultipleDiffs(diffText) {
		if (!diffText) return []
		const diffs = []
		const diffLines = diffText.split('\n')
		let currentDiff = null
		let currentChanges = []

		for (let i = 0; i < diffLines.length; i++) {
			const line = diffLines[i] // Start of a new diff

			if (line.startsWith('diff --git')) {
				if (currentDiff) {
					currentDiff.diff = currentChanges.join('\n')
					diffs.push(currentDiff)
				}

				currentDiff = {
					oldPath: null,
					newPath: null,
					diff: null,
					isNewFile: false,
					isDeletedFile: false,
					isRenamedFile: false
				}
				currentChanges = []

				const pathMatch = line.match(/diff --git a\/(.*) b\/(.*)/)
				if (pathMatch) {
					currentDiff.oldPath = pathMatch[1]
					currentDiff.newPath = pathMatch[2]
				}

				if (diffLines[i + 1].startsWith('new file mode')) {
					currentDiff.isNewFile = true
				}
			} else if (currentDiff) {
				currentChanges.push(line)
			}
		}

		if (currentDiff) {
			currentDiff.diff = currentChanges.join('\n')
			diffs.push(currentDiff)
		}

		return diffs
	}

	async getTransformedRevisionInfo(revisionId) {
		const revision = await this.getRevisionDetailsWithReviewers(revisionId)
		console.log('Revision:', revision)
		const author = await this.getUserInfo(revision[0].authorPHID)
		const project = await this.getPhabricatorRepositoryInfo(
			revision[0].repositoryPHID
		)
		console.log('Project:', project)
		const jiraId = revision[0].title.match(/\[(\w+-\d+)\]/)

		const commentsData = await this.getRevisionComments(
			revisionId,
			revision[0].phid
		)
		console.log('Comments Data:', commentsData)
		const { comments, inlineComments } =
			await this.processComments(commentsData)

		console.log('Comments:', comments)
		const changes = await this.getDiffChanges(revision[0].phid)
		console.log('Changes:', changes)
		const commits = changes[0].attachments.commits

		const diffsInfo = await this.getDiffInfo(changes[0].phid)
		console.log('Diffs Info:', diffsInfo)
		let diffs = []
		diffs = await this.getRawDiff(diffsInfo[0].id)
		const parsedDiffs = this.parseMultipleDiffs(diffs)
		console.log('Parsed Diffs:', parsedDiffs)

		const reviewers = Object.keys(revision[0].reviewers)
		console.log('Reviewers:', reviewers)
		const reviewerDetails = await Promise.all(
			reviewers.map(async (reviewer) => {
				console.log('Reviewer:', reviewer)
				let reviewerInfo = await this.getUserInfo(reviewer)
				console.log('Reviewer Info:', reviewerInfo)
				// skip if reviewer is author or does not have data
				if (reviewer === revision[0].authorPHID || !reviewerInfo[0]) {
					return
				}
				return {
					name: reviewerInfo[0]?.fields.realName,
					username: reviewerInfo[0]?.fields.username
				}
			})
		)
		const newRevision = {
			id: revision[0].id,
			title: revision[0].title,
			summary: revision[0].summary,
			status: revision[0].statusName,
			url: `${this.config.phabricatorUrl}/D${revision[0].id}`,
			author: {
				name: author[0]?.fields.realName,
				username: author[0]?.fields.username
			},
			dateModified: revision[0].dateModified * 1000,
			project: project[0]?.fields.name || 'No project',
			jiraId: jiraId ? jiraId[1] : '',
			branch: revision[0].branch,
			commits: commits.commits,
			reviewers: reviewerDetails,
			comments: comments || [],
			changes: changes || [],
			diffs: parsedDiffs,
			inlineComments: inlineComments || []
		}
		localStorage.setItem('revision', JSON.stringify(newRevision))
		return newRevision
	}
}

export default PhabricatorAPI
