local create_command = vim.api.nvim_create_user_command

create_command("SRestore", function()
	require("persistence").load({ last = true })
end, {})

create_command("SSelect", function()
	require("persistence").select()
end, {})

function ReloadAllBuffers()
	local current = vim.api.nvim_get_current_buf()
	for _, buf in ipairs(vim.api.nvim_list_bufs()) do
		if vim.api.nvim_buf_is_loaded(buf) and vim.bo[buf].buftype == "" then
			vim.api.nvim_buf_call(buf, function()
				vim.cmd("silent! edit")
			end)
		end
	end
	vim.api.nvim_set_current_buf(current)
end

create_command("ReloadBufs", function()
	ReloadAllBuffers()
end, {})
