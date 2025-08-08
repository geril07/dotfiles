local modules_to_require = {
	"my.lazy",

	"my.options",
	"my.keymaps",
	"my.overrides",
	"my.commands",
	"my.filetype",

	"my.winbar",
	"my.autocmds",
	"my.autosave",
	"my.gui",

	function()
		require("vim._extui").enable({})
	end,
}

for _, my_module in ipairs(modules_to_require) do
	local _, err = pcall(function()
		if type(my_module) == "function" then
			my_module()
		else
			require(my_module)
		end
	end)

	if err ~= nil then
		print(err)
	end
end
