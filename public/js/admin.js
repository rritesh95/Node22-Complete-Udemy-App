const deleteProduct = (btn) => {
    const productId = btn.parentNode.querySelector('[name=productId]').value;
    const csrfToken = btn.parentNode.querySelector('[name=_csrf]').value;

    const productElement = btn.closest('article');

    fetch('/admin/product/' + productId, {
        method: "DELETE", //Uppercase not mandatory but a good practice
        headers: {
            'csrf-token': csrfToken //'csrf-token" should be the key as per "csurf" package
        }
    })
    .then(result => {
        return result.json();
    })
    .then(data => {
        console.log(data);
        productElement.parentNode.removeChild(productElement);
    })
    .catch(err => {
        console.log(err);
    })
}