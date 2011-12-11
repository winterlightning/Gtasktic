class Set
  constructor: (set) ->
    @_set = (if set == undefined then [] else set)
    @length = @_set.length
    @contains = (element) ->
      @_set.indexOf(element) != -1
  
  union: (s) ->
    A = (if s.length > @length then s else this)
    B = (if s.length > @length then this else s)
    set = A.copy()
    i = 0
    
    while i < B.length
      set.add B._set[i]
      i++
    set
  
  intersection: (s) ->
    set = new Set()
    A = (if s.length > @length then s else this)
    B = (if s.length > @length then this else s)
    i = 0
    
    while i < B.length
      element = B._set[i]
      set.add element  if A.contains(element)
      i++
    set
  
  difference: (s) ->
    set = new Set()
    i = 0
    
    while i < @length
      element = @_set[i]
      set.add element  unless s.contains(element)
      i++
    set
  
  symmetricDifference: (s) ->
    @union(s).difference @intersection(s)
  
  isSuperSet: (s) ->
    i = 0
    
    while i < s.length
      return false  unless @contains(s._set[i])
      i++
    true
  
  isSubSet: (s) ->
    i = 0
    
    while i < @length
      return false  unless s.contains(@_set[i])
      i++
    true
  
  add: (element) ->
    if @_set.indexOf(element) == -1
      @_set.push element
      @length++
    @length
  
  remove: (element) ->
    i = @_set.indexOf(element)
    unless i == -1
      @length--
      @_set.splice(i, 1)[0]
    else
      null
  
  copy: ->
    new Set(@_set.slice())
  
  asArray: ->
    @_set

exports = this
exports.Set = Set