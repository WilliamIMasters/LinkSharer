function validateForm() {
   let formData = document.forms["postForm"]["title"].value
   if(formData == "") {
      alert("Title must be filled in");
      return false;
   }
}
