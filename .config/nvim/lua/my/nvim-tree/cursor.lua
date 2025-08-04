local api = vim.api

local is_transparent = false

local startup = true

local add_tr_cursor = function()
	if is_transparent then
		return
	end
	if startup then
		startup = false
		vim.schedule(function()
			vim.opt_local.guicursor:append("n:TransparentCursor")
		end)
	else
		vim.opt_local.guicursor:append("n:TransparentCursor")
	end
	is_transparent = true
end

local remove_tr_cursor = function()
	if not is_transparent then
		return
	end
	vim.opt_local.guicursor:remove("n:TransparentCursor")
	is_transparent = false
end

local function toggle_tree_focus()
	if vim.bo.filetype == "NvimTree" then
		add_tr_cursor()
	else
		remove_tr_cursor()
	end
end

api.nvim_create_autocmd({ "BufEnter" }, {
	callback = toggle_tree_focus,
})

api.nvim_create_autocmd({ "Filetype" }, {
	pattern = { "lazy", "DressingInput", "snacks_input" },
	callback = toggle_tree_focus,
})
