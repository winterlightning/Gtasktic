(function() {
  String.prototype.replaceAll = function(strReplace, strWith) {
    var reg;
    reg = new RegExp(strReplace, "ig");
    return this.replace(reg, strWith);
  };
}).call(this);
