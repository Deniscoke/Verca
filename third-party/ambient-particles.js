/**
 * Ambient particle canvas — adapted from MIT-licensed CodePen by shakil
 * https://codepen.io/shakilbit/pen/ZEzqQQL
 * Uses EaselJS + GSAP 3 (original used TweenMax 1.x). Colors tuned for Verca.
 * See third-party/ambient-background-LICENSE.txt
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof createjs === 'undefined' || typeof gsap === 'undefined') return;

  var canvas = document.getElementById('verca-ambient-canvas');
  if (!canvas) return;

  var mobile = window.matchMedia('(max-width: 768px)').matches;
  var density = mobile ? 0.38 : 1;

  var ParticleEngine = (function () {
    function ParticleEngine(canvasId) {
      if (!(this instanceof ParticleEngine)) {
        return new ParticleEngine(canvasId);
      }

      var self = this;
      this.canvas_id = canvasId;
      this.stage = new createjs.Stage(canvasId);
      var el = document.getElementById(canvasId);
      this.totalWidth = this.canvasWidth = el.width = el.offsetWidth;
      this.totalHeight = this.canvasHeight = el.height = el.offsetHeight;
      this.compositeStyle = 'source-over';

      this.particleSettings = [
        { id: 'small', num: Math.floor(280 * density), fromX: 0, toX: this.totalWidth, ballwidth: 2.5, alphamax: 0.22, areaHeight: 0.5, color: '#5E7A68', fill: false },
        { id: 'medium', num: Math.floor(90 * density), fromX: 0, toX: this.totalWidth, ballwidth: 7, alphamax: 0.18, areaHeight: 1, color: '#B86447', fill: true },
        { id: 'large', num: Math.floor(9 * density), fromX: 0, toX: this.totalWidth, ballwidth: 26, alphamax: 0.15, areaHeight: 1, color: '#C4B896', fill: true }
      ];
      this.particleArray = [];
      this.lights = [
        { ellipseWidth: 380, ellipseHeight: 120, alpha: 0.24, offsetX: 0, offsetY: 0, color: '#D4886A' },
        { ellipseWidth: 300, ellipseHeight: 200, alpha: 0.14, offsetX: -48, offsetY: 0, color: '#7A9A82' },
        { ellipseWidth: 88, ellipseHeight: 72, alpha: 0.11, offsetX: 72, offsetY: -44, color: '#C97B5C' }
      ];

      this.stage.compositeOperation = self.compositeStyle;

      function drawBgLight() {
        var light;
        var bounds;
        var blurFilter;
        for (var i = 0, len = self.lights.length; i < len; i++) {
          light = new createjs.Shape();
          light.graphics.beginFill(self.lights[i].color).drawEllipse(0, 0, self.lights[i].ellipseWidth, self.lights[i].ellipseHeight);
          light.regX = self.lights[i].ellipseWidth / 2;
          light.regY = self.lights[i].ellipseHeight / 2;
          light.y = light.initY = self.totalHeight / 2 + self.lights[i].offsetY;
          light.x = light.initX = self.totalWidth / 2 + self.lights[i].offsetX;

          blurFilter = new createjs.BlurFilter(self.lights[i].ellipseWidth, self.lights[i].ellipseHeight, 1);
          bounds = blurFilter.getBounds();
          light.filters = [blurFilter];
          light.cache(bounds.x - self.lights[i].ellipseWidth / 2, bounds.y - self.lights[i].ellipseHeight / 2, bounds.width * 2, bounds.height * 2);
          light.alpha = self.lights[i].alpha;
          light.compositeOperation = 'source-over';
          self.stage.addChildAt(light, 0);

          self.lights[i].elem = light;
        }

        gsap.fromTo(
          self.lights[0].elem,
          { scaleX: 1.5, x: self.lights[0].elem.initX, y: self.lights[0].elem.initY },
          {
            duration: 10,
            scaleX: 2,
            scaleY: 0.7,
            yoyo: true,
            repeat: -1,
            ease: 'power1.inOut'
          }
        );
        gsap.fromTo(
          self.lights[1].elem,
          { x: self.lights[1].elem.initX, y: self.lights[1].elem.initY },
          {
            duration: 12,
            delay: 5,
            x: self.totalWidth / 2 + 100,
            y: self.totalHeight / 2 - 50,
            scaleY: 2,
            scaleX: 2,
            yoyo: true,
            repeat: -1,
            ease: 'power1.inOut'
          }
        );
        gsap.fromTo(
          self.lights[2].elem,
          { x: self.lights[2].elem.initX, y: self.lights[2].elem.initY },
          {
            duration: 8,
            delay: 2,
            x: self.totalWidth / 2 - 200,
            y: self.totalHeight / 2,
            scaleY: 1.5,
            scaleX: 1.5,
            yoyo: true,
            repeat: -1,
            ease: 'power1.inOut'
          }
        );
      }

      var blurFilter;
      function drawParticles() {
        for (var i = 0, len = self.particleSettings.length; i < len; i++) {
          var ball = self.particleSettings[i];
          var circle;
          for (var s = 0; s < ball.num; s++) {
            circle = new createjs.Shape();
            if (ball.fill) {
              circle.graphics.beginFill(ball.color).drawCircle(0, 0, ball.ballwidth);
              blurFilter = new createjs.BlurFilter(ball.ballwidth / 2, ball.ballwidth / 2, 1);
              circle.filters = [blurFilter];
              var b = blurFilter.getBounds();
              circle.cache(-50 + b.x, -50 + b.y, 100 + b.width, 100 + b.height);
            } else {
              circle.graphics.beginStroke(ball.color).setStrokeStyle(1).drawCircle(0, 0, ball.ballwidth);
            }

            circle.alpha = range(0, 0.1);
            circle.alphaMax = ball.alphamax;
            circle.distance = ball.ballwidth * 2;
            circle.ballwidth = ball.ballwidth;
            circle.flag = ball.id;
            circle.areaHeight = ball.areaHeight;
            self.applySettings(circle, ball.fromX, ball.toX, ball.areaHeight);
            circle.speed = range(2, 10);
            circle.y = circle.initY;
            circle.x = circle.initX;
            circle.scaleX = circle.scaleY = range(0.3, 1);

            self.stage.addChild(circle);
            animateBall(circle);
            self.particleArray.push(circle);
          }
        }
      }

      this.applySettings = function (circle, positionX, totalWidth, areaHeight) {
        circle.speed = range(1, 3);
        circle.initY = weightedRange(0, self.totalHeight, 1, [self.totalHeight * (2 - areaHeight / 2) / 4, self.totalHeight * (2 + areaHeight / 2) / 4], 0.8);
        circle.initX = weightedRange(positionX, totalWidth, 1, [positionX + (totalWidth - positionX) / 4, positionX + ((totalWidth - positionX) * 3) / 4], 0.6);
      };

      function animateBall(ball) {
        var scale = range(0.3, 1);
        var xpos = range(ball.initX - ball.distance, ball.initX + ball.distance);
        var ypos = range(ball.initY - ball.distance, ball.initY + ball.distance);
        var speed = ball.speed;
        gsap.to(ball, {
          duration: speed,
          scaleX: scale,
          scaleY: scale,
          x: xpos,
          y: ypos,
          ease: 'power2.inOut',
          onComplete: animateBall,
          onCompleteParams: [ball]
        });
        gsap.to(ball, {
          duration: speed / 2,
          alpha: range(0.1, ball.alphaMax),
          ease: 'power2.inOut',
          onComplete: fadeout,
          onCompleteParams: [ball, speed]
        });
      }

      function fadeout(ball, speed) {
        ball.speed = range(2, 10);
        gsap.to(ball, { duration: speed / 2, alpha: 0 });
      }

      drawBgLight();
      drawParticles();
    }

    ParticleEngine.prototype.render = function () {
      this.stage.update();
    };

    ParticleEngine.prototype.resize = function () {
      var el = document.getElementById(this.canvas_id);
      this.totalWidth = this.canvasWidth = el.width = el.offsetWidth;
      this.totalHeight = this.canvasHeight = el.height = el.offsetHeight;
      this.render();

      for (var i = 0, length = this.particleArray.length; i < length; i++) {
        this.applySettings(this.particleArray[i], 0, this.totalWidth, this.particleArray[i].areaHeight);
      }

      for (var j = 0, len = this.lights.length; j < len; j++) {
        this.lights[j].elem.initY = this.totalHeight / 2 + this.lights[j].offsetY;
        this.lights[j].elem.initX = this.totalWidth / 2 + this.lights[j].offsetX;
        gsap.to(this.lights[j].elem, { duration: 0.5, x: this.lights[j].elem.initX, y: this.lights[j].elem.initY });
      }
    };

    return ParticleEngine;
  })();

  function range(min, max) {
    return min + (max - min) * Math.random();
  }

  function round(num, precision) {
    var decimal = Math.pow(10, precision);
    return Math.round(decimal * num) / decimal;
  }

  function weightedRange(to, from, decimalPlaces, wRange, weightStrength) {
    if (typeof from === 'undefined' || from === null) from = 0;
    if (typeof decimalPlaces === 'undefined' || decimalPlaces === null) decimalPlaces = 0;
    if (typeof wRange === 'undefined' || wRange === null) wRange = 0;
    if (typeof weightStrength === 'undefined' || weightStrength === null) weightStrength = 0;

    var ret;
    if (to === from) return to;

    if (wRange && Math.random() <= weightStrength) {
      ret = round(Math.random() * (wRange[1] - wRange[0]) + wRange[0], decimalPlaces);
    } else {
      ret = round(Math.random() * (to - from) + from, decimalPlaces);
    }
    return ret;
  }

  var started = false;
  function boot() {
    if (started) return;
    var c = document.getElementById('verca-ambient-canvas');
    if (!c || c.offsetWidth < 2 || c.offsetHeight < 2) return;
    started = true;
    var particles = new ParticleEngine('verca-ambient-canvas');
    createjs.Ticker.framerate = 48;
    createjs.Ticker.addEventListener('tick', function () {
      particles.render();
    });
    window.addEventListener('resize', function () {
      particles.resize();
    }, false);
  }

  requestAnimationFrame(boot);
  window.addEventListener('load', boot, { once: true });
})();
