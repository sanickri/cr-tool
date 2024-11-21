import react, { useEffect } from 'react'
import { getGitlabMRbyId } from '../utils/gitlabUtils'

const RevisionDetail = ({ projectId, mergeRequestId }) => {
	useEffect(() => {
		const fetchMR = async () => {
			const mr = await getGitlabMRbyId(projectId, mergeRequestId)
			console.log('Merge Request:', mr)
		}

		fetchMR()
	}, [projectId, mergeRequestId])

	// TODO; Implement the UI for the Revision Detail
	return <div>Revision Detail</div>
}

export default RevisionDetail
