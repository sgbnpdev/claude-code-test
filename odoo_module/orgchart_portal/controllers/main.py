import json
from odoo import http
from odoo.http import request


class OrgChartController(http.Controller):

    @http.route('/orgchart', type='http', auth='public', website=True)
    def orgchart_page(self, **kwargs):
        """Render the main org chart portal page."""
        graph_data = request.env['orgchart.person'].sudo().get_graph_data()
        teams = sorted({n['team'] for n in graph_data['nodes']})
        return request.render('orgchart_portal.orgchart_page', {
            'graph_data_json': json.dumps(graph_data),
            'teams': teams,
            'people_count': len(graph_data['nodes']),
        })

    @http.route('/orgchart/data', type='json', auth='public', website=True)
    def orgchart_data(self):
        """JSON endpoint — called after adding/removing a person."""
        return request.env['orgchart.person'].sudo().get_graph_data()

    @http.route('/orgchart/add', type='json', auth='user', website=True)
    def add_person(self, name, title, team, manager_id=None):
        """Add a new person to the org chart."""
        vals = {'name': name, 'title': title, 'team': team}
        if manager_id:
            vals['manager_id'] = int(manager_id)
        person = request.env['orgchart.person'].sudo().create(vals)
        return {'id': str(person.id), 'name': person.name, 'title': person.title, 'team': person.team}

    @http.route('/orgchart/remove', type='json', auth='user', website=True)
    def remove_person(self, person_id):
        """Remove a person (and unlink their direct reports)."""
        person = request.env['orgchart.person'].sudo().browse(int(person_id))
        if person.exists():
            person.unlink()
        return {'ok': True}
