vim.api.nvim_create_autocmd("FileType", {
	group = vim.api.nvim_create_augroup("mariasolos/treesitter_folding", { clear = true }),
	desc = "Enable Treesitter folding",
	callback = function(args)
		local bufnr = args.buf

		-- Enable Treesitter folding when not in huge files and when Treesitter
		-- is working.
		if vim.bo[bufnr].filetype ~= "bigfile" and pcall(vim.treesitter.start, bufnr) then
			vim.api.nvim_buf_call(bufnr, function()
				vim.wo[0][0].foldmethod = "expr"
				vim.wo[0][0].foldexpr = "v:lua.vim.treesitter.foldexpr()"
				vim.cmd.normal("zx")
			end)
		else
			-- Else just fallback to using indentation.
			vim.wo[0][0].foldmethod = "indent"
		end
	end,
})

vim.api.nvim_create_autocmd("FileType", {
	pattern = "*",
	callback = function()
		-- vim.opt.formatoptions:remove({ "o", "c" })
		vim.bo.formatoptions = "tqj"
	end,
})

vim.api.nvim_create_autocmd("TextYankPost", {
	group = vim.api.nvim_create_augroup("YankHighlight", { clear = true }),
	callback = function()
		vim.highlight.on_yank({ higroup = "IncSearch", timeout = 100, priority = 250 })
	end,
})
