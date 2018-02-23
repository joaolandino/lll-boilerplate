const gulp = require('gulp'),
      gutil = require('gulp-util'),
      ftp = require('vinyl-ftp'),
      connect = require('gulp-connect'),
      args = require('yargs').argv,
      scss = require('gulp-sass'),
      autoprefixer = require('gulp-autoprefixer'),
      swPrecache = require('sw-precache'),
      sequence = require('gulp-sequence'),
      minify = require('gulp-minifier'),
      inline = require('gulp-inline'),
      del = require('del'),
      imagemin = require('gulp-imagemin');

var isProduction = args.env === 'prod';

const dirDevelopment = 'src/',
      dirProduction = 'prod/',

      root = isProduction ? dirProduction : dirDevelopment,
      
      dirSCSS = dirDevelopment + 'assets/scss/',
      dirCSS = dirDevelopment  + 'assets/css/';


gulp.task('webserver', () => {
  connect.server({
    root: dirDevelopment,
    livereload: true
  });
});

gulp.task('scss', () => {
  gulp.src(dirSCSS + '**/*.scss')
      .pipe(scss().on('error', scss.logError))
      .pipe(autoprefixer({
        browsers: ['last 2 versions', '> 5%', 'Firefox ESR']
      }))
      .pipe(gulp.dest(dirCSS))
      .pipe(connect.reload());
})

gulp.task('sw', function(callback) {
  swPrecache.write(`${root}/service-worker.js`, {
    staticFileGlobs: [root + '/**/*.{js,html,css,png,jpg,jpeg,gif,svg,eot,ttf,woff}'],
    stripPrefix: root
  }, callback);
});

gulp.task('watch', () => {
  gulp.watch(dirDevelopment + '**/*.scss', () => {
    gulp.start('sw');
    gulp.start('scss');
  });

  gulp.watch(dirDevelopment + '**/*.js', () => {
    gulp.start('sw');
    gulp.src(dirDevelopment).pipe(connect.reload());
  });

  gulp.watch(dirDevelopment + '**/*.html', () => {
    gulp.start('sw');
    gulp.src(dirDevelopment).pipe(connect.reload());
  });
})

gulp.task('minify', function() {
  if(isProduction){
    return gulp.src(dirDevelopment + '**/*')
    .pipe(minify({
      minify: true,
      minifyHTML: {
        collapseWhitespace: true,
        conservativeCollapse: true,
      },
      minifyJS: {
        sourceMap: false
      },
      minifyCSS: true,
      getKeptComment: function (content, filePath) {
          var m = content.match(/\/\*![\s\S]*?\*\//img);
          return m && m.join('\n') + '\n' || '';
      }
    }))
    .pipe(gulp.dest(dirProduction));
  }
});

gulp.task('inline', () => {
  if(isProduction){
    return gulp.src(dirProduction + '**.html')
    .pipe(inline({
      base: dirProduction,
      disabledTypes: ['svg', 'img']
    }))
    .pipe(gulp.dest(dirProduction));
  }
})

gulp.task('clean-build', function () {
  if(isProduction){
    return del([
      dirProduction + 'assets/**/*',
      '!' + dirProduction + 'assets/images/**'
    ]);
  }
});

gulp.task('imagemin', () =>
    gulp.src(dirProduction + 'assets/images/*')
      .pipe(imagemin([
        imagemin.gifsicle({interlaced: true}),
        imagemin.jpegtran({progressive: true}),
        imagemin.optipng({optimizationLevel: 5}),
        imagemin.svgo({
          plugins: [
            {removeViewBox: true},
            {cleanupIDs: false}
          ]
        })
      ]))
      .pipe(gulp.dest(dirProduction + 'assets/images'))
);

gulp.task('deploy', function () { 
  var conn = ftp.create({
      host:     '',
      user:     '',
      password: '',
      parallel: 10,
      log:      gutil.log
  });

  var globs = [
    dirProduction + "**/*"
  ];

  return gulp.src( globs, { base: '', buffer: false } )
  .pipe(conn.dest('/public'));
});

gulp.task('dev', ['scss', 'webserver', 'watch', 'sw']);
gulp.task('build', sequence('scss', 'minify', 'inline', 'clean-build', 'imagemin', 'sw'));