import React, { useEffect, useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import { Alert, Container } from '@mui/material'
import Link from '@mui/material/Link'
import PhabricatorAPI from '../utils/phabricatorUtils'

const formatDate = (date) => {
	const options = { year: 'numeric', month: '2-digit', day: '2-digit' }
	return new Date(date).toLocaleDateString(undefined, options)
}

const RevisionsDataGrid = ({ revisions }) => {
	const [rows, setRows] = useState([])
	const [filterModel, setFilterModel] = useState(() => {
		// Retrieve filter model from localStorage on initial load
		const savedFilterModel = localStorage.getItem('dataGridFilterModel')
		return savedFilterModel ? JSON.parse(savedFilterModel) : { items: [] }
	})

	useEffect(() => {
		const fetchData = async () => {
			const phabricatorAPI = new PhabricatorAPI({
				phabricatorUrl: localStorage.getItem('phabricatorUrl'),
				phabricatorToken: localStorage.getItem('phabricatorToken')
			})

			const flatRevisions = revisions.flat()
			const updatedRevisions = await Promise.all(
				flatRevisions.map((revision) =>
					updateRevisionData(revision, phabricatorAPI)
				)
			)

			setRows(updatedRevisions)
		}

		fetchData()
	}, [revisions])

	const updateRevisionData = async (revision, phabricatorAPI) => {
		let authorName = revision.author?.name || 'Unknown'
		let project =
			{
				name: revision.project_namespace,
				url: revision.project_url
			} || 'Unknown'
		if (revision.phid) {
			authorName = await fetchAuthorName(
				revision.fields.authorPHID,
				phabricatorAPI
			)
			project = await fetchProjectNameAndId(
				revision.fields.repositoryPHID,
				phabricatorAPI
			)
		}
		return mapRevisionToRow(revision, authorName, project)
	}

	const fetchAuthorName = async (authorPHID, phabricatorAPI) => {
		try {
			const userInfo = await phabricatorAPI.getUserInfo(authorPHID)
			return userInfo[0].fields.realName || 'Unknown'
		} catch (error) {
			console.error('Error fetching user info:', error)
			return 'Unknown'
		}
	}

	const fetchProjectNameAndId = async (projectPHID, phabricatorAPI) => {
		try {
			const projectInfo =
				await phabricatorAPI.getPhabricatorRepositoryInfo(projectPHID)
			return (
				{
					name: projectInfo[0]?.fields.name,
					url: `${localStorage.getItem('phabricatorUrl')}/diffusion/${projectInfo[0]?.id}`
				} || 'Unknown'
			)
		} catch (error) {
			console.error('Error fetching project info:', error)
			return 'Unknown'
		}
	}

	const mapRevisionToRow = (revision, authorName, project) => ({
		id: revision.id,
		title: revision.phid ? revision.fields.title : revision.title,
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
			: revision.work_in_progress,
		project: project.name,
		projectUrl: project.url,
		source: revision.phid ? 'P' : 'G'
	})

	const columns = [
		{ field: 'source', headerName: '', width: 50 },
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
			width: 150,
			renderCell: (cellValues) => {
				const date = new Date(cellValues.row.dateModified)
				return formatDate(date)
			}
		},
		{
			field: 'Project',
			renderCell: (cellValues) => (
				<Link href={`${cellValues.row.projectUrl}`}>
					{cellValues.row.project}
				</Link>
			),
			width: 200
		},
		{ field: 'isDraft', headerName: 'Draft', width: 100 }
	]

	const handleFilterModelChange = (newFilterModel) => {
		setFilterModel(newFilterModel)
		localStorage.setItem(
			'dataGridFilterModel',
			JSON.stringify(newFilterModel)
		)
	}

	return (
		<>
			{revisions && (
				<Container maxWidth={false}>
					<DataGrid
						rows={rows}
						columns={columns}
						filterModel={filterModel}
						onFilterModelChange={handleFilterModelChange}
					/>
				</Container>
			)}
			{!revisions && (
				<Alert severity="info" color="warning">
					No revisions found
				</Alert>
			)}
		</>
	)
}

export default RevisionsDataGrid
