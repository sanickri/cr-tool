import React, { useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import { Alert, Container, Tooltip } from '@mui/material'
import Link from '@mui/material/Link'
import DraftsIcon from '@mui/icons-material/HourglassTop'
import mapStatusToIcon from '../utils/mapStatusToIcon'

const formatDate = (date) => {
	const options = { year: 'numeric', month: '2-digit', day: '2-digit' }
	return new Date(date).toLocaleDateString(undefined, options)
}

const RevisionsDataGrid = ({ revisions, isFetching }) => {
	const [filterModel, setFilterModel] = useState(() => {
		const savedFilterModel = localStorage.getItem('dataGridFilterModel')
		return savedFilterModel ? JSON.parse(savedFilterModel) : { items: [] }
	})

	const rows = revisions.flat().map((revision) => ({
		id: revision.id,
		title: revision.title,
		status: revision.status,
		url: revision.url,
		author: revision.author,
		dateModified: revision.dateModified,
		isDraft: revision.isDraft,
		project: revision.project,
		projectUrl: revision.projectUrl,
		color: revision.color,
		iid: revision.iid || '',
		jiraId: revision.jiraId
	}))

	const columns = [
		{
			field: 'status',
			headerName: '',
			width: 50,
			renderCell: (cellValues) => {
				return mapStatusToIcon[cellValues.row.status]
			}
		},
		{
			field: 'ID',
			renderCell: (cellValues) => (
				<Link href={`${cellValues.row.url}`}>{cellValues.row.id}</Link>
			)
		},
		{
			field: 'title',
			headerName: 'Title',
			width: 500,
			renderCell: (cellValues) => {
				if (cellValues.row.isDraft) {
					return (
						<>
							<Tooltip title="This is a draft">
								<DraftsIcon
									sx={{
										color: 'white',
										position: 'relative',
										top: '15%'
									}}
								/>
							</Tooltip>
							{cellValues.row.title}
						</>
					)
				}
				return cellValues.row.title
			}
		},
		{ field: 'author', headerName: 'Author', width: 150 },
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
		{
			field: 'Jira ID',
			headerName: 'Jira ID',
			width: 150,
			renderCell: (cellValues) => {
				if (cellValues.row.jiraId) {
					return (
						<Link
							href={`https://emplifi.atlassian.net/browse/${cellValues.row.jiraId}`}
						>
							{cellValues.row.jiraId}
						</Link>
					)
				}
				return 'No Jira ID'
			}
		}
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
			{!revisions && !isFetching && revisions.flat().length === 0 && (
				<Alert severity="info" color="warning">
					No revisions found
				</Alert>
			)}
			{revisions && (
				<Container maxWidth={false}>
					<DataGrid
						rows={rows}
						columns={columns}
						filterModel={filterModel}
						onFilterModelChange={handleFilterModelChange}
						getRowClassName={(params) =>
							`row-color-${params.row.color}`
						}
						sx={{
							'& .row-color-blue': {
								backgroundColor: '#a0d4f2'
							},
							'& .row-color-orange': {
								backgroundColor: '#f2caa0'
							},
							'& .row-color-yellow': {
								backgroundColor: '#fff9c4'
							}
						}}
					/>
				</Container>
			)}
		</>
	)
}

export default RevisionsDataGrid
