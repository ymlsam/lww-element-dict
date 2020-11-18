'use strict';


// import
const gulp       = require('gulp');
const typescript = require('gulp-typescript');
const tsc        = typescript.createProject('./src/tsconfig.json');


// config
const DIR  = {
	SRC : 'src',
	DIST: 'dist',
};
const FILE = {
	ALL: '**/*',
	TS : '**/*.ts',
};
const TASK = {
	BUILD  : 'build',
	WATCH  : 'watch',
	DEFAULT: 'default',
};


// build
gulp.task(TASK.BUILD, function() {
	return tsc.src()
		.pipe(tsc()).js
		.pipe(gulp.dest(DIR.DIST));
});


// watch
gulp.task(TASK.WATCH, function() {
	gulp.watch([DIR.SRC + '/' + FILE.TS], gulp.parallel(TASK.BUILD));
});


// for development use
gulp.task(TASK.DEFAULT, gulp.series(TASK.BUILD, TASK.WATCH));
