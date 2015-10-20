var gulp = require('gulp'),
	ngAnnotate = require('gulp-ng-annotate'),
	rename = require('gulp-rename'),
	uglify = require('gulp-uglify');

gulp.task('compress', function() {
	return gulp
		.src('src/*.js')
		.pipe(ngAnnotate())
		.pipe(uglify())
		.pipe(rename({
			extname: ".min.js"
		}))
		.pipe(gulp.dest('dist'));
});
