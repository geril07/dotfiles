vim.filetype.add({
	pattern = {
		["%.env%.[%w_.-]+"] = "sh",
		[".*%.gitconfig"] = "gitconfig",
	},
	extension = {
		mdx = "jsx",
		ftl = "ftl",
	},
})
