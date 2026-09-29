import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ignores:['**/dist/**','**/node_modules/**','.local/**']},js.configs.recommended,...ts.configs.recommended,{files:['**/*.ts','**/*.tsx'],rules:{'@typescript-eslint/no-explicit-any':'off','@typescript-eslint/no-unused-vars':'off','@typescript-eslint/no-non-null-assertion':'off','@typescript-eslint/no-empty-object-type':'off'}});
