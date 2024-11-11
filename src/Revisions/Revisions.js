import React, { useEffect, useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import { Container } from '@mui/material'
import Link from '@mui/material/Link'
import { PhabricatorAPI } from '../utils/auth'

const formatDate = (date) => {
	const options = { year: 'numeric', month: '2-digit', day: '2-digit' }
	return new Date(date).toLocaleDateString(undefined, options)
}

const RevisionsDataGrid = ({ revisions }) => {
	const [rows, setRows] = useState([])

	useEffect(() => {
		const fetchAuthors = async () => {
			const phabricatorConfig = {
				phabricatorUrl: localStorage.getItem('phabricatorUrl'),
				phabricatorToken: localStorage.getItem('phabricatorToken')
			}
			const phabricatorAPI = new PhabricatorAPI(phabricatorConfig)

			const updatedRevisions = await Promise.all(
				revisions.map(async (revision) => {
					let authorName = revision.author?.name || 'Unknown'
					if (revision.phid) {
						try {
							const userInfo = await phabricatorAPI.getUserInfo(
								revision.fields.authorPHID
							)
							authorName =
								userInfo[0].fields.realName || 'Unknown'
						} catch (error) {
							console.error('Error fetching user info:', error)
						}
					}
					return {
						id: revision.id,
						title: revision.phid
							? revision.fields.title
							: revision.title,
						status: revision.phid
							? revision.fields.status.name
							: revision.detailed_merge_status,
						url: revision.phid
							? `${localStorage.getItem('phabricatorUrl')}/D${revision.id}`
							: revision.web_url,
						author: authorName,
						dateModified: revision.phid
							? revision.fields.dateModified * 1000
							: revision.updated_at,
						isDraft: revision.phid
							? revision.fields.isDraft
							: revision.work_in_progress
					}
				})
			)

			setRows(updatedRevisions)
		}

		fetchAuthors()
	}, [revisions])

	const columns = [
		{
			field: 'ID',
			renderCell: (cellValues) => (
				<Link href={`${cellValues.row.url}`}>{cellValues.row.id}</Link>
			)
		},
		{ field: 'title', headerName: 'Title', width: 500 },
		{ field: 'author', headerName: 'Author', width: 150 },
		{ field: 'status', headerName: 'Status', width: 150 },
		{
			field: 'dateModified',
			headerName: 'Date Modified',
			width: 200,
			renderCell: (cellValues) => {
				const date = new Date(cellValues.row.dateModified)
				return formatDate(date)
			}
		},
		{ field: 'isDraft', headerName: 'Draft', width: 100 }
	]

	return (
		<Container maxWidth="lg">
			<DataGrid rows={rows} columns={columns} pageSize={5} />
		</Container>
	)
}

export default RevisionsDataGrid
