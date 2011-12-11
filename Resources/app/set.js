(function() {
  var Set, exports;
  Set = (function() {
    function Set(set) {
      this._set = (set === void 0 ? [] : set);
      this.length = this._set.length;
      this.contains = function(element) {
        return this._set.indexOf(element) !== -1;
      };
    }
    Set.prototype.union = function(s) {
      var A, B, i, set;
      A = (s.length > this.length ? s : this);
      B = (s.length > this.length ? this : s);
      set = A.copy();
      i = 0;
      while (i < B.length) {
        set.add(B._set[i]);
        i++;
      }
      return set;
    };
    Set.prototype.intersection = function(s) {
      var A, B, element, i, set;
      set = new Set();
      A = (s.length > this.length ? s : this);
      B = (s.length > this.length ? this : s);
      i = 0;
      while (i < B.length) {
        element = B._set[i];
        if (A.contains(element)) {
          set.add(element);
        }
        i++;
      }
      return set;
    };
    Set.prototype.difference = function(s) {
      var element, i, set;
      set = new Set();
      i = 0;
      while (i < this.length) {
        element = this._set[i];
        if (!s.contains(element)) {
          set.add(element);
        }
        i++;
      }
      return set;
    };
    Set.prototype.symmetricDifference = function(s) {
      return this.union(s).difference(this.intersection(s));
    };
    Set.prototype.isSuperSet = function(s) {
      var i;
      i = 0;
      while (i < s.length) {
        if (!this.contains(s._set[i])) {
          return false;
        }
        i++;
      }
      return true;
    };
    Set.prototype.isSubSet = function(s) {
      var i;
      i = 0;
      while (i < this.length) {
        if (!s.contains(this._set[i])) {
          return false;
        }
        i++;
      }
      return true;
    };
    Set.prototype.add = function(element) {
      if (this._set.indexOf(element) === -1) {
        this._set.push(element);
        this.length++;
      }
      return this.length;
    };
    Set.prototype.remove = function(element) {
      var i;
      i = this._set.indexOf(element);
      if (i !== -1) {
        this.length--;
        return this._set.splice(i, 1)[0];
      } else {
        return null;
      }
    };
    Set.prototype.copy = function() {
      return new Set(this._set.slice());
    };
    Set.prototype.asArray = function() {
      return this._set;
    };
    return Set;
  })();
  exports = this;
  exports.Set = Set;
}).call(this);
