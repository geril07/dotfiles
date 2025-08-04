local M = {}

---@param mode string
---@return string|table
local function split_strmodes_to_object_modes(mode)
	if #mode == 1 then
		return mode
	end

	local result = {}
	for i = 1, #mode do
		table.insert(result, mode:sub(i, i))
	end

	return result
end

--- @param mode string|table
--- @param lhs string
--- @param rhs string|function
--- @param opts table?
function M.map(mode, lhs, rhs, opts)
	local options = { silent = true }
	if opts then
		options = vim.tbl_extend("force", options, opts)
	end
	vim.keymap.set(mode, lhs, rhs, options)
end

---@param tbl table
function M.map_tbl(tbl)
	for mode, maps in pairs(tbl) do
		mode = split_strmodes_to_object_modes(mode)
		for lhs, values in pairs(maps) do
			local rhs = type(values) == "table" and values[1] or values
			local opts = type(values) == "table" and values[2] or nil
			M.map(mode, lhs, rhs, opts)
		end
	end
end

---@param map string
---@return string
function M.double_leader(map)
	return "<leader><leader>" .. map
end

---@param map string
---@return string
function M.cmd(map)
	return ":" .. map .. "<CR>"
end

---@param tbl table
---@return table
function M.wrap_into_silent(tbl)
	for _, value in ipairs(tbl) do
		value.silent = true
	end
	return tbl
end

return M
