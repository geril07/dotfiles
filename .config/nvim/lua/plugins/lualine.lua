local function harpoon_files()
	local marks = require("harpoon").get_mark_config()["marks"]
	local active_index = require("harpoon.mark").get_index_of(vim.fn.bufname())

	local result = {}
	for index, value in pairs(marks) do
		local file = vim.fn.split(value["filename"], "/")
		file = file[#file]
		file = index == active_index and file .. "*" or file .. " "
		table.insert(result, " " .. file)
	end
	return table.concat(result)
end

---@type table<string, string?>
local progress_status = {
	client = nil,
	kind = nil,
	title = nil,
}

--- The latest LSP progress message.
---@return string
local function lsp_progress_component()
	if not progress_status.client or not progress_status.title then
		return ""
	end

	return table.concat({
		"%#StatuslineSpinner#...",
		string.format("%%#StatuslineTitle#%s  ", progress_status.client),
		string.format("%%#StatuslineItalic#%s...", progress_status.title),
	})
end

vim.api.nvim_create_autocmd("LspProgress", {
	group = vim.api.nvim_create_augroup("mariasolos/statusline", { clear = true }),
	desc = "Update LSP progress in statusline",
	pattern = { "begin", "end" },
	callback = function(args)
		-- This should in theory never happen, but I've seen weird errors.
		if not args.data then
			return
		end

		progress_status = {
			client = vim.lsp.get_client_by_id(args.data.client_id).name,
			kind = args.data.params.value.kind,
			title = args.data.params.value.title,
		}

		if progress_status.kind == "end" then
			progress_status.title = nil
			-- Wait a bit before clearing the status.
			vim.defer_fn(function()
				vim.cmd.redrawstatus()
			end, 2000)
		else
			vim.cmd.redrawstatus()
		end
	end,
})

return {
	{
		"nvim-lualine/lualine.nvim",
		enabled = true,
		dependencies = { "nvim-tree/nvim-web-devicons" },
		opts = function()
			return {
				sections = {
					lualine_a = { "mode" },
					lualine_b = { "branch", "diff", "diagnostics" },
					lualine_c = {
						{
							"filename",
							file_status = false, -- displays file status (readonly status, modified status)
							path = 0, -- 0 = just filename, 1 = relative path, 2 = absolute path
						},
					},
					-- lualine_x = { lsp_progress_component, "filetype" },
					lualine_x = { "lsp_status", "filetype" },
					-- lualine_x = { harpoon_files, "filetype" },
					lualine_y = { "progress" },

					-- lualine_z = { "location" },
					lualine_z = {},
				},
			}
		end,
	},
}
