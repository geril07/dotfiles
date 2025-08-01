vim.filetype.add({
	pattern = {
		["%.env%.[%w_.-]+"] = "sh",
	},
	extension = {
		mdx = "jsx",
		ftl = "ftl",
	},
})

