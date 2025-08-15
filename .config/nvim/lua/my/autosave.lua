local api = vim.api

local group = api.nvim_create_augroup("AutoSave", { clear = true })

local filetypes_to_ignore = { "harpoon" }

--- @param buf number
--- @return boolean
local function get_is_need_write_buf(buf)
	local modifiable = vim.bo[buf].modifiable
	local readonly = vim.bo[buf].readonly
	local filetype = vim.bo[buf].filetype
	local modified = vim.bo[buf].modified

	if not modified or not modifiable or readonly or file == "" then
		return false
	end

	for _, value in ipairs(filetypes_to_ignore) do
		if value == filetype then
			return false
		end
	end

	return true
end

-- Debounce for some reason sometimes rejects formatting
local debounce_state = {
	enabled = false,
	delay = 200,
	last = nil,
}

local function save_all()
	vim.cmd("silent! wa")
end

api.nvim_create_autocmd({ "TextChanged", "InsertLeave", "BufLeave" }, {
	group = group,
	desc = "AutoSave",
	callback = function()
		if debounce_state.enabled then
			local now = vim.uv.hrtime()
			debounce_state.last = now
			vim.defer_fn(function()
				if debounce_state.last == now then
					save_all()
				end
			end, debounce_state.delay)
		else
			save_all()
		end
	end,
})
