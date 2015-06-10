// css filter control
document.getElementById('tab1').addEventListener('click', function() { 
  document.getElementById('benchmark').style.display = "block";
  document.getElementById('fxosuservice').style.display = "none";
  document.getElementById('description').style.display = "none";
});
document.getElementById('tab2').addEventListener('click', function() { 
  document.getElementById('fxosuservice').style.display = "block";
  document.getElementById('benchmark').style.display = "none";
  document.getElementById('description').style.display = "none";
});