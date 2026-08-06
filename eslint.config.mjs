export default [
    // 1. 叫它閉嘴：忽略備份檔、打包檔、以及外層的 Node.js 工具腳本
    {
        ignores: [
            "helper/**", 
            "refactored_output/**", 
            "dist/**", 
            "story_data/**",
            "*.js" // 忽略根目錄的腳本，如 migrate.js
        ]
    },
    // 2. 教它規矩：所有的代碼都是現代的 ES6 Module，跑在瀏覽器上
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module"
        }
    }
];