---@class SimpleWinbarConfig
local default_config = {
	enabled = true,
	events = { "DirChanged", "BufEnter", "BufFilePost", "BufWritePost" },
	separator = "›",
	show_path = true,
	left_spacing = nil,

	exclude_filetypes = {},
}

---@class SimpleWinbarConfig
local config = vim.tbl_extend("force", {}, default_config, {
	show_path = false,
	exclude_filetypes = {
		"help",
		"startify",
		"dashboard",
		"packer",
		"neogitstatus",
		"NvimTree",
		"Trouble",
		"alpha",
		"lir",
		"Outline",
		"spectre_panel",
		"toggleterm",
		"qf",
		"harpoon",
		"TelescopePrompt",
		"fzf",
		"",
	},
	-- left_spacing = "       ",
  left_spacing = nil
})

local status_web_devicons_ok, web_devicons = pcall(require, "nvim-web-devicons")
local api = vim.api
local fn = vim.fn

local hl_groups = {
	filename = "WinbarFile",
	path = "WinbarFilePath",
	icon = "WinbarFileIcon",
	separator = "WinbarSeparator",
}

---@param value string
---@param hl_group string
---@return string
local wrap_with_hl = function(value, hl_group)
	return "%#" .. hl_group .. "#" .. value .. "%*"
end

local get_filename_line = function()
	local result = ""
	local filename = fn.expand("%:t")
	local filetype = vim.bo.filetype or ""

	if not filename or filename == "" then
		return result
	end

	if filetype and filetype ~= "" and status_web_devicons_ok then
		local default = filetype and false or true
		local file_icon, hl_name = web_devicons.get_icon_by_filetype(filetype, { default = default })
		result = result .. wrap_with_hl(file_icon .. " ", hl_name or ("DevIcon" .. filetype))
	end

	result = result .. wrap_with_hl(filename, hl_groups.filename)

	return result
end

---@return string
local get_filepath_line = function()
	local file_path = vim.fn.expand("%:~:.:h")
	file_path = file_path:gsub("^%.", "")
	file_path = file_path:gsub("^%/", "")

	local file_path_list = {}
	local _ = string.gsub(file_path, "[^/]+", function(w)
		table.insert(file_path_list, w)
	end)

	local value = ""

	for i = 1, #file_path_list do
		value = value .. "%#NvimTreeFolderIcon# %*"
		value = value
			.. wrap_with_hl(file_path_list[i], hl_groups.path)
			.. " "
			.. wrap_with_hl(config.separator, hl_groups.separator)
			.. " "
	end

	return value
end

local combine_winbar_line = function()
	local result = ""
	local left_spacing = ""

	if config.left_spacing then
		if type(config.left_spacing) == "string" then
			left_spacing = config.left_spacing
		elseif type(config.left_spacing) == "function" then
			left_spacing = config.left_spacing()
		end
	end

	if config.show_path then
		result = result .. get_filepath_line()
	end

	result = result .. get_filename_line()

	if result == "" then
		return result
	end

	return left_spacing .. result
end

local attach_aucmd = function()
	api.nvim_create_autocmd(config.events, {
		callback = function()
			if vim.tbl_contains(config.exclude_filetypes, vim.bo.filetype) then
				return api.nvim_set_option_value("winbar", nil, { scope = "local" })
			end
			local line = combine_winbar_line()

			api.nvim_set_option_value("winbar", line, { scope = "local" })
		end,
	})
end

attach_aucmd()
